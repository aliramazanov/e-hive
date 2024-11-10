import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  getHello(): string {
    return 'Hello from Auth Service!';
  }

  register(data: any) {
    return {
      message: 'Registration endpoint hit',
      data,
    };
  }
}
