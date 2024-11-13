import { MessagePatterns } from '@app/common';
import {
  ConflictException,
  Controller,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { UserService } from './user.service';

interface UserResponse {
  id: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
}

@Controller('user')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  @MessagePattern(MessagePatterns.user_create)
  async createUser(data: { email: string }): Promise<string> {
    this.logger.log(
      `Received request to create user with email: ${data.email}`,
    );

    try {
      const existingUser = await this.userService.findByEmail(data.email);

      if (existingUser) {
        this.logger.warn(`User already exists with email: ${data.email}`);
        throw new ConflictException('User already exists');
      }

      const user = await this.userService.createUser(data.email);
      this.logger.log(`User created successfully with ID: ${user.id}`);

      return user.id;
    } catch (error) {
      this.logger.error(`Failed to create user: ${error.message}`, error.stack);

      if (error instanceof ConflictException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to create user');
    }
  }

  @MessagePattern(MessagePatterns.user_regstration_failed)
  async handleRegistrationFailure(data: { email: string; error: string }) {
    this.logger.log(`Handling registration failure for email: ${data.email}`);
    this.logger.debug(`Failure reason: ${data.error}`);

    try {
      const user = await this.userService.findByEmail(data.email);

      if (user) {
        await this.userService.removeUser(user.id);
        this.logger.log(
          `User with ID: ${user.id} has been removed due to registration failure`,
        );
      } else {
        this.logger.debug(`No user found to remove for email: ${data.email}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle registration failure: ${error.message}`,
        error.stack,
      );
    }
  }

  @MessagePattern(MessagePatterns.user_get)
  async getUser(data: { id: string }): Promise<UserResponse> {
    this.logger.debug(`Received request to get user with ID: ${data.id}`);

    try {
      const user = await this.userService.findById(data.id);
      this.logger.debug(`Successfully retrieved user: ${user.id}`);

      return {
        id: user.id,
        email: user.email,
        isActive: user.isActive,
        createdAt: user.createdAt,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get user with ID: ${data.id} - ${error.message}`,
        error.stack,
      );

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to get user');
    }
  }
}
