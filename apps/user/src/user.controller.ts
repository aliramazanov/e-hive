import { MessagePatterns } from '@app/common';
import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Put,
  Query,
} from '@nestjs/common';
import { MessagePattern, RpcException } from '@nestjs/microservices';
import { UserPreferences } from './definitions/user-preferences';
import { UserSettings } from './definitions/user-settings';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserSearchQuery } from './dto/user-search.query.dto';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  @Get(':id')
  async getUserHttp(@Param('id') id: string) {
    this.logger.debug(`HTTP request to get user with ID: ${id}`);
    try {
      const user = await this.userService.findById(id);
      if (!user) {
        throw new RpcException('User not found');
      }
      return user;
    } catch (error) {
      this.logger.error(`Failed to get user: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Put(':id/profile')
  async updateProfileHttp(
    @Param('id') id: string,
    @Body() profile: UpdateProfileDto,
  ) {
    this.logger.debug(`HTTP request to update profile for user ID: ${id}`);
    try {
      return await this.userService.updateProfile(id, profile);
    } catch (error) {
      this.logger.error(
        `Failed to update profile: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Put(':id/preferences')
  async updatePreferencesHttp(
    @Param('id') id: string,
    @Body() preferences: Partial<UserPreferences>,
  ) {
    this.logger.debug(`HTTP request to update preferences for user ID: ${id}`);
    try {
      return await this.userService.updatePreferences(id, preferences);
    } catch (error) {
      this.logger.error(
        `Failed to update preferences: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Put(':id/settings')
  async updateSettingsHttp(
    @Param('id') id: string,
    @Body() settings: Partial<UserSettings>,
  ) {
    this.logger.debug(`HTTP request to update settings for user ID: ${id}`);
    try {
      return await this.userService.updateSettings(id, settings);
    } catch (error) {
      this.logger.error(
        `Failed to update settings: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get()
  async searchUsersHttp(@Query() query: UserSearchQuery) {
    this.logger.debug('HTTP request to search users');
    try {
      const [users, total] = await this.userService.searchUsers(query);
      return { users, total };
    } catch (error) {
      this.logger.error(
        `Failed to search users: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern(MessagePatterns.user_create)
  async createUser(data: { email: string }) {
    this.logger.log(
      `Received request to create user with email: ${data.email}`,
    );
    try {
      const user = await this.userService.createUser(data.email);
      this.logger.log(`User created successfully with ID: ${user.id}`);
      return user.id;
    } catch (error) {
      this.logger.error(`Failed to create user: ${error.message}`, error.stack);
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(MessagePatterns.user_registration_failed)
  async handleRegistrationFailure(data: { email: string }) {
    this.logger.log(`Handling registration failure for email: ${data.email}`);
    try {
      const user = await this.userService.findByEmail(data.email);
      if (user) {
        await this.userService.softDeleteUser(user.id);
        this.logger.log(`User with ID: ${user.id} has been soft deleted`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle registration failure: ${error.message}`,
        error.stack,
      );
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(MessagePatterns.user_get)
  async getUser(data: { id: string }) {
    this.logger.debug(`Received request to get user with ID: ${data.id}`);
    try {
      const user = await this.userService.findById(data.id);
      if (!user) {
        throw new RpcException('User not found');
      }
      return user;
    } catch (error) {
      this.logger.error(
        `Failed to get user with ID: ${data.id} - ${error.message}`,
        error.stack,
      );
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(MessagePatterns.user_update_profile)
  async updateProfile(data: { id: string; profile: UpdateProfileDto }) {
    this.logger.debug(`Updating profile for user ID: ${data.id}`);
    try {
      const user = await this.userService.updateProfile(data.id, data.profile);
      this.logger.log(`Profile updated for user ID: ${data.id}`);
      return user;
    } catch (error) {
      this.logger.error(
        `Failed to update profile for user ID: ${data.id} - ${error.message}`,
        error.stack,
      );
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(MessagePatterns.user_update_preferences)
  async updatePreferences(data: {
    id: string;
    preferences: Partial<UserPreferences>;
  }) {
    this.logger.debug(`Updating preferences for user ID: ${data.id}`);
    try {
      const user = await this.userService.updatePreferences(
        data.id,
        data.preferences,
      );
      this.logger.log(`Preferences updated for user ID: ${data.id}`);
      return user;
    } catch (error) {
      this.logger.error(
        `Failed to update preferences for user ID: ${data.id} - ${error.message}`,
        error.stack,
      );
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(MessagePatterns.user_update_settings)
  async updateSettings(data: { id: string; settings: Partial<UserSettings> }) {
    this.logger.debug(`Updating settings for user ID: ${data.id}`);
    try {
      const user = await this.userService.updateSettings(
        data.id,
        data.settings,
      );
      this.logger.log(`Settings updated for user ID: ${data.id}`);
      return user;
    } catch (error) {
      this.logger.error(
        `Failed to update settings for user ID: ${data.id} - ${error.message}`,
        error.stack,
      );
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(MessagePatterns.user_deactivate)
  async deactivateAccount(data: { id: string }) {
    this.logger.debug(`Deactivating account for user ID: ${data.id}`);
    try {
      await this.userService.deactivateAccount(data.id);
      this.logger.log(`Account deactivated for user ID: ${data.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to deactivate account for user ID: ${data.id} - ${error.message}`,
        error.stack,
      );
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(MessagePatterns.user_reactivate)
  async reactivateAccount(data: { id: string }) {
    this.logger.debug(`Reactivating account for user ID: ${data.id}`);
    try {
      await this.userService.reactivateAccount(data.id);
      this.logger.log(`Account reactivated for user ID: ${data.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to reactivate account for user ID: ${data.id} - ${error.message}`,
        error.stack,
      );
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(MessagePatterns.user_search)
  async searchUsers(query: UserSearchQuery) {
    this.logger.debug('Searching users with query:', query);
    try {
      const [users, total] = await this.userService.searchUsers(query);
      this.logger.log(`Found ${total} users matching search criteria`);
      return { users, total };
    } catch (error) {
      this.logger.error(
        `Failed to search users: ${error.message}`,
        error.stack,
      );
      throw new RpcException(error.message);
    }
  }

  @MessagePattern(MessagePatterns.user_update_last_login)
  async updateLastLogin(data: { id: string }) {
    this.logger.debug(`Updating last login for user ID: ${data.id}`);
    try {
      await this.userService.updateLastLogin(data.id);
      this.logger.log(`Last login updated for user ID: ${data.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to update last login for user ID: ${data.id} - ${error.message}`,
        error.stack,
      );
      throw new RpcException(error.message);
    }
  }
}
