import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @MessagePattern('create_user')
  async createUser(data: { email: string }) {
    const user = await this.userService.createUser(data.email);
    return user.id;
  }
}
