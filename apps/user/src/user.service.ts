import { MessagePatterns } from '@app/common';
import { RabbitMQService } from '@app/rabbitmq';
import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, FindOptionsWhere, Like, Repository } from 'typeorm';
import { SearchUsersDto } from './dto/search-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entity/user.entity';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly rmqService: RabbitMQService,
  ) {}

  async createUser(email: string): Promise<User> {
    this.logger.debug(`Creating user with email: ${email}`);

    try {
      const user = await this.userRepository.manager.transaction(
        async (transactionalEntityManager) => {
          const existingUser = await transactionalEntityManager
            .createQueryBuilder(User, 'user')
            .setLock('pessimistic_write')
            .where('user.email = :email', { email })
            .getOne();

          if (existingUser) {
            throw new ConflictException(`User with this email already exists`);
          }

          const newUser = this.userRepository.create({
            email,
            username: this.generateDefaultUsername(email),
          });

          const savedUser = await transactionalEntityManager.save(newUser);

          await this.rmqService.publish(MessagePatterns.user_create, {
            userId: savedUser.id,
            email: savedUser.email,
            timestamp: new Date(),
          });

          return savedUser;
        },
      );

      return user;
    } catch (error) {
      this.logger.error(
        `Failed to create user. Error: ${error.message}`,
        error.stack,
      );
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    this.logger.debug(
      `Updating user ${id} with data: ${JSON.stringify(updateUserDto)}`,
    );

    try {
      await this.validateUpdateDto(id, updateUserDto);

      const user = await this.findById(id);

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      const previousData = { ...user };
      Object.assign(user, updateUserDto);
      user.updatedAt = new Date();

      const updatedUser = await this.userRepository.save(user);

      await this.rmqService.publish(MessagePatterns.user_update, {
        userId: id,
        previousData,
        newData: updatedUser,
        timestamp: new Date(),
      });

      this.logger.debug(`User updated successfully`);

      return updatedUser;
    } catch (error) {
      this.logger.error(
        `Failed to update user ${id}. Error: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async searchUsers(searchDto: SearchUsersDto) {
    this.logger.debug(
      `Searching users with criteria: ${JSON.stringify(searchDto)}`,
    );

    try {
      const { search, page = 1, limit = 10 } = searchDto;
      const skip = (page - 1) * limit;

      const where: FindOptionsWhere<User> = {
        isActive: true,
        ...(search && {
          username: Like(`%${search}%`),
        }),
      };

      const [users, total] = await this.userRepository.findAndCount({
        where,
        skip,
        take: limit,
        order: { createdAt: 'DESC' },
        select: [
          'id',
          'email',
          'username',
          'firstName',
          'lastName',
          'createdAt',
        ],
      });

      this.logger.debug(`Search completed. Found ${users.length} users`);

      return {
        users,
        metadata: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(`Search failed. Error: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to search users');
    }
  }

  async getUserProfile(id: string): Promise<User> {
    this.logger.debug(`Fetching user profile for ID: ${id}`);

    try {
      const user = await this.findById(id);
      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      return user;
    } catch (error) {
      this.logger.error(
        `Failed to get user profile: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User> {
    try {
      return await this.userRepository.findOne({ where: { email } });
    } catch (error) {
      this.logger.error(
        `Failed to find user by email: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to find user');
    }
  }

  async findById(id: string): Promise<User> {
    try {
      return await this.userRepository.findOne({ where: { id } });
    } catch (error) {
      this.logger.error(
        `Failed to find user by ID: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to find user');
    }
  }

  async removeUser(id: string): Promise<void> {
    this.logger.debug(`Removing user with ID: ${id}`);

    try {
      const user = await this.findById(id);
      if (!user) {
        throw new NotFoundException(`User not found`);
      }

      user.isActive = false;
      user.updatedAt = new Date();
      await this.userRepository.save(user);

      await this.rmqService.publish(MessagePatterns.user_delete, {
        userId: id,
        timestamp: new Date(),
      });

      this.logger.debug(`User removed successfully`);
    } catch (error) {
      this.logger.error(
        `Failed to remove user ${id}. Error: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async bulkCreate(users: DeepPartial<User>[]): Promise<User[]> {
    this.logger.debug(`Bulk creating ${users.length} users`);
    const startTime = Date.now();

    try {
      const createdUsers = await this.userRepository.manager.transaction(
        async (transactionalEntityManager) => {
          const entities = users.map((user) =>
            this.userRepository.create(user),
          );
          return await transactionalEntityManager.save(entities);
        },
      );

      const duration = Date.now() - startTime;
      this.logger.debug(
        `Bulk create completed. Created ${createdUsers.length} users. Duration: ${duration}ms`,
      );

      return createdUsers;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Bulk create failed. Duration: ${duration}ms. Error: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to bulk create users');
    }
  }

  async deactivateInactiveUsers(daysInactive: number): Promise<number> {
    this.logger.debug(`Deactivating users inactive for ${daysInactive} days`);
    const startTime = Date.now();

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

      const result = await this.userRepository
        .createQueryBuilder()
        .update(User)
        .set({ isActive: false, updatedAt: new Date() })
        .where('updatedAt < :cutoffDate AND isActive = :isActive', {
          cutoffDate,
          isActive: true,
        })
        .execute();

      const duration = Date.now() - startTime;
      this.logger.debug(
        `Deactivated ${result.affected} users. Duration: ${duration}ms`,
      );

      return result.affected || 0;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Failed to deactivate inactive users. Duration: ${duration}ms. Error: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to deactivate users');
    }
  }

  private async validateUpdateDto(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<void> {
    if (updateUserDto.username) {
      const existingUser = await this.userRepository.findOne({
        where: { username: updateUserDto.username },
      });

      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Username already taken');
      }
    }
  }

  private generateDefaultUsername(email: string): string {
    const randomBytes = require('crypto').randomBytes(3);
    const randomString = randomBytes.toString('hex').slice(0, 5);
    return `${email.split('@')[0]}_${randomString}`;
  }
}
