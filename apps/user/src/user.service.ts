import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entity/user.entity';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createUser(email: string): Promise<User> {
    this.logger.debug(`Attempting to create user with email: ${email}`);

    try {
      return await this.userRepository.manager.transaction(
        async (transactionalEntityManager) => {
          this.logger.debug('Starting transaction for user creation');

          const existingUser = await transactionalEntityManager
            .createQueryBuilder(User, 'user')
            .setLock('pessimistic_write')
            .where('user.email = :email', { email })
            .getOne();

          if (existingUser) {
            this.logger.warn(`User already exists with email: ${email}`);
            throw new ConflictException('User already exists');
          }

          const user = new User();
          user.email = email;
          user.isActive = true;

          const savedUser = await transactionalEntityManager.save(user);
          this.logger.debug(
            `User created successfully with ID: ${savedUser.id}`,
          );

          return savedUser;
        },
      );
    } catch (error) {
      this.logger.error(`Failed to create user: ${error.message}`, error.stack);

      if (error instanceof ConflictException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to create user');
    }
  }

  async findByEmail(email: string): Promise<User> {
    this.logger.debug(`Finding user by email: ${email}`);

    try {
      const user = await this.userRepository.findOne({ where: { email } });

      if (!user) {
        this.logger.debug(`No user found with email: ${email}`);
        return null;
      }

      this.logger.debug(`Found user with ID: ${user.id}`);
      return user;
    } catch (error) {
      this.logger.error(
        `Error finding user by email: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to find user by email');
    }
  }

  async findById(id: string): Promise<User> {
    this.logger.debug(`Finding user by ID: ${id}`);

    try {
      const user = await this.userRepository.findOne({ where: { id } });

      if (!user) {
        this.logger.warn(`No user found with ID: ${id}`);
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      this.logger.debug(`Found user: ${user.id}`);
      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Error finding user by ID: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to find user by ID');
    }
  }

  async removeUser(id: string): Promise<void> {
    this.logger.debug(`Attempting to remove user with ID: ${id}`);

    try {
      const result = await this.userRepository.delete(id);

      if (result.affected === 0) {
        this.logger.warn(`No user found to remove with ID: ${id}`);
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      this.logger.debug(`Successfully removed user with ID: ${id}`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(`Failed to remove user: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to remove user');
    }
  }
}
