import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  FindOptionsWhere,
  Like,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { UserPreferences } from './definitions/user-preferences';
import { IUserService } from './definitions/user-service.interface';
import { UserSettings } from './definitions/user-settings';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserSearchQuery } from './dto/user-search.query.dto';
import { User } from './entity/user.entity';

@Injectable()
export class UserService implements IUserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async deactivateAccount(id: string): Promise<void> {
    this.logger.debug(`Deactivating account for user ID: ${id}`);
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isActive = false;
    await this.userRepository.save(user);
    this.logger.log(`Account deactivated for user ID: ${id}`);
  }

  async reactivateAccount(id: string): Promise<void> {
    this.logger.debug(`Reactivating account for user ID: ${id}`);
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isActive = true;
    await this.userRepository.save(user);
    this.logger.log(`Account reactivated for user ID: ${id}`);
  }

  async softDeleteUser(id: string): Promise<void> {
    this.logger.debug(`Soft deleting user ID: ${id}`);
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.deletedAt = new Date();
    user.isActive = false;
    await this.userRepository.save(user);
    this.logger.log(`User soft deleted, ID: ${id}`);
  }

  async restoreUser(id: string): Promise<void> {
    this.logger.debug(`Restoring user ID: ${id}`);
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.deletedAt = null;
    user.isActive = true;
    await this.userRepository.save(user);
    this.logger.log(`User restored, ID: ${id}`);
  }

  async updateLastLogin(id: string): Promise<void> {
    this.logger.debug(`Updating last login for user ID: ${id}`);
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.lastLoginAt = new Date();
    await this.userRepository.save(user);
    this.logger.log(`Last login updated for user ID: ${id}`);
  }

  async searchUsers(query: UserSearchQuery): Promise<[User[], number]> {
    this.logger.debug('Searching users with query:', query);

    const where: FindOptionsWhere<User> = {};

    // Build search criteria
    if (query.email) {
      where.email = Like(`%${query.email}%`);
    }

    if (query.name) {
      where.firstName = Like(`%${query.name}%`);
      where.lastName = Like(`%${query.name}%`);
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.role) {
      where.role = query.role;
    }

    if (query.location) {
      where.location = Like(`%${query.location}%`);
    }

    if (query.createdAfter || query.createdBefore) {
      where.createdAt = Between(
        query.createdAfter || new Date(0),
        query.createdBefore || new Date(),
      );
    }

    if (query.lastLoginAfter) {
      where.lastLoginAt = MoreThanOrEqual(query.lastLoginAfter);
    }

    const [users, total] = await this.userRepository.findAndCount({
      where,
      skip: query.skip,
      take: query.take,
      order: {
        [query.sortBy]: query.sortOrder,
      },
    });

    this.logger.log(`Found ${total} users matching search criteria`);
    return [users, total];
  }

  async createUser(email: string): Promise<User> {
    return this.userRepository.manager.transaction(async (manager) => {
      const existingUser = await manager
        .createQueryBuilder(User, 'user')
        .setLock('pessimistic_write')
        .where('user.email = :email', { email })
        .getOne();

      if (existingUser) {
        throw new ConflictException('User already exists');
      }

      const user = this.userRepository.create({
        email,
        role: 'user',
        isActive: true,
        preferences: {},
        socialLinks: {},
        settings: {
          privacy: { profileVisibility: 'public' },
        },
      });

      return manager.save(user);
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async updateProfile(id: string, data: UpdateProfileDto): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');

    Object.assign(user, data);
    return this.userRepository.save(user);
  }

  async updatePreferences(
    id: string,
    preferences: Partial<UserPreferences>,
  ): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');

    user.preferences = { ...user.preferences, ...preferences };
    return this.userRepository.save(user);
  }

  async updateSettings(
    id: string,
    settings: Partial<UserSettings>,
  ): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');

    user.settings = { ...user.settings, ...settings };
    return this.userRepository.save(user);
  }
}
