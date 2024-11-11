import { Controller, Logger } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  private readonly logger = new Logger(UserController.name);
  constructor(private readonly userService: UserService) {}

  @MessagePattern('create_user')
  async createUser(data: { email: string }) {
    try {
      const existingUser = await this.userService.findByEmail(data.email);
      if (existingUser) {
        throw new Error('User already exists');
      }

      const user = await this.userService.createUser(data.email);
      return user.id;
    } catch (error) {
      this.logger.error(`Failed to create user: ${error.message}`);
      throw error;
    }
  }

  @MessagePattern('user.registration.failed')
  async handleRegistrationFailure(data: { email: string }) {
    try {
      const user = await this.userService.findByEmail(data.email);
      if (user) {
        await this.userService.removeUser(user.id);
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle registration failure: ${error.message}`,
      );
    }
  }

  @MessagePattern('get_user')
  async getUser(data: { id: string }) {
    this.logger.debug(`Received request to get user with ID: ${data.id}`);
    return this.userService.findById(data.id);
  }
}
