import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Public } from './guards/public.decorator';
import { MessagePattern } from '@nestjs/microservices';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @MessagePattern('auth.register')
  async register(@Body() createUserDto: { email: string; password: string }) {
    return this.authService.register(createUserDto);
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @MessagePattern('auth.login')
  @HttpCode(HttpStatus.OK)
  async login(@CurrentUser() user: any) {
    return this.authService.login(user);
  }

  @Public()
  @Post('refresh')
  @MessagePattern('auth.refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() body: { refreshToken: string }) {
    return this.authService.refreshToken(body.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('verify')
  @MessagePattern('auth.verify')
  @HttpCode(HttpStatus.OK)
  verify(@CurrentUser() user: any) {
    return { status: 'ok', user };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @MessagePattern('auth.profile')
  @HttpCode(HttpStatus.OK)
  getProfile(@CurrentUser() user: any) {
    return user;
  }
}
