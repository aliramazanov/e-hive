import { MessagePatterns } from '@app/common';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BulkCreateUsersDto } from './dto/bulk-create-users.dto';
import { DeactivateUsersDto } from './dto/deactivate-users.dto';
import { SearchUsersDto } from './dto/search-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  @MessagePattern(MessagePatterns.user_create)
  async createUser(data: { email: string }) {
    this.logger.log(
      `Received request to create user with email: ${data.email}`,
    );
    try {
      const existingUser = await this.userService.findByEmail(data.email);
      if (existingUser) {
        throw new Error('User already exists');
      }

      const user = await this.userService.createUser(data.email);
      this.logger.log(`User created successfully with ID: ${user.id}`);
      return user.id;
    } catch (error) {
      this.logger.error(`Failed to create user: ${error.message}`, error.stack);
      throw error;
    }
  }

  @MessagePattern(MessagePatterns.user_regstration_failed)
  async handleRegistrationFailure(data: { email: string }) {
    this.logger.log(`Handling registration failure for email: ${data.email}`);
    try {
      const user = await this.userService.findByEmail(data.email);
      if (user) {
        await this.userService.removeUser(user.id);
        this.logger.log(`User with ID: ${user.id} has been removed`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle registration failure: ${error.message}`,
        error.stack,
      );
    }
  }

  @MessagePattern(MessagePatterns.user_get)
  async getUser(@Payload() data: { id: string }) {
    this.logger.debug(`Fetching user profile: ${data.id}`);

    try {
      const user = await this.userService.findById(data.id);
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    } catch (error) {
      this.logger.error(
        `User profile fetch failed. Error: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidationPipe({ transform: true })) updateUserDto: UpdateUserDto,
  ) {
    this.logger.debug(`Updating user: ${id}`);
    const startTime = Date.now();

    try {
      const updatedUser = await this.userService.updateUser(id, updateUserDto);

      const duration = Date.now() - startTime;
      this.logger.debug(`User updated successfully. Duration: ${duration}ms`);

      return updatedUser;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `User update failed. Duration: ${duration}ms, Error: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get('search')
  @HttpCode(HttpStatus.OK)
  async searchUsers(
    @Query(new ValidationPipe({ transform: true })) searchDto: SearchUsersDto,
  ) {
    this.logger.debug(`Searching users`);
    const startTime = Date.now();

    try {
      const result = await this.userService.searchUsers(searchDto);

      const duration = Date.now() - startTime;
      this.logger.debug(
        `Search completed. Found ${result.users.length} users. Duration: ${duration}ms`,
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Search failed. Duration: ${duration}ms, Error: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getUserProfile(@Param('id', ParseUUIDPipe) id: string) {
    this.logger.debug(`Fetching user profile: ${id}`);
    const startTime = Date.now();

    try {
      const user = await this.userService.getUserProfile(id);

      const duration = Date.now() - startTime;
      this.logger.debug(
        `Profile fetched successfully. Duration: ${duration}ms`,
      );

      return user;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Profile fetch failed. Duration: ${duration}ms, Error: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  async bulkCreateUsers(
    @Body(new ValidationPipe({ transform: true })) dto: BulkCreateUsersDto,
  ) {
    this.logger.debug(`Bulk creating ${dto.users.length} users`);
    const startTime = Date.now();

    try {
      const users = await this.userService.bulkCreate(dto.users);

      const duration = Date.now() - startTime;
      this.logger.debug(
        `Bulk creation completed. Created ${users.length} users. Duration: ${duration}ms`,
      );

      return users;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Bulk creation failed. Duration: ${duration}ms, Error: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Post('deactivate')
  @HttpCode(HttpStatus.OK)
  async deactivateInactiveUsers(
    @Body(new ValidationPipe({ transform: true })) dto: DeactivateUsersDto,
  ) {
    this.logger.debug(
      `Deactivating users inactive for ${dto.daysInactive} days`,
    );
    const startTime = Date.now();

    try {
      const count = await this.userService.deactivateInactiveUsers(
        dto.daysInactive,
      );

      const duration = Date.now() - startTime;
      this.logger.debug(
        `Deactivation completed. Deactivated ${count} users. Duration: ${duration}ms`,
      );

      return { deactivatedCount: count };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Deactivation failed. Duration: ${duration}ms, Error: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@Param('id', ParseUUIDPipe) id: string) {
    this.logger.debug(`Deleting user: ${id}`);
    const startTime = Date.now();

    try {
      await this.userService.removeUser(id);

      const duration = Date.now() - startTime;
      this.logger.debug(`User deleted successfully. Duration: ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `User deletion failed. Duration: ${duration}ms, Error: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
