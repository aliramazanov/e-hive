import { Controller, Logger } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  @MessagePattern('user.create')
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

  @MessagePattern('user.registration.failed')
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

  @MessagePattern('user.get')
  async getUser(data: { id: string }) {
    this.logger.debug(`Received request to get user with ID: ${data.id}`);
    try {
      const user = await this.userService.findById(data.id);
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    } catch (error) {
      this.logger.error(
        `Failed to get user with ID: ${data.id} - ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
