import { Controller, Logger } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  private readonly logger = new Logger(UserController.name);
  constructor(private readonly userService: UserService) {}

  @MessagePattern('create_user')
  async createUser(data: { email: string }) {
    this.logger.debug(
      `Received request to create user with email: ${data.email}`,
    );
    const user = await this.userService.createUser(data.email);
    return user.id;
  }

  @MessagePattern('get_user')
  async getUser(data: { id: string }) {
    this.logger.debug(`Received request to get user with ID: ${data.id}`);
    return this.userService.findById(data.id);
  }
}
