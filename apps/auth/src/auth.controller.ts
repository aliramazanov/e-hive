import { CurrentUser, MessagePatterns, Public } from '@app/common';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() createUserDto: { email: string; password: string }) {
    this.logger.debug(
      `HTTP register request for email: ${createUserDto.email}`,
    );
    return this.authService.register(createUserDto);
  }

  @MessagePattern(MessagePatterns.auth_register)
  async registerMessagePattern(createUserDto: {
    email: string;
    password: string;
  }) {
    this.logger.debug(
      `Message pattern register request for email: ${createUserDto.email}`,
    );
    return this.authService.register(createUserDto);
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@CurrentUser() user: any) {
    this.logger.debug(`HTTP login request for user: ${user.email}`);
    return this.authService.login(user);
  }

  @MessagePattern(MessagePatterns.auth_login)
  async loginMessagePattern(user: any) {
    this.logger.debug(`Message pattern login request for user: ${user.email}`);
    return this.authService.login(user);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() body: { refreshToken: string }) {
    this.logger.debug('HTTP refresh token request');
    return this.authService.refreshToken(body.refreshToken);
  }

  @MessagePattern(MessagePatterns.auth_refresh)
  async refreshTokenMessagePattern(body: { refreshToken: string }) {
    this.logger.debug('Message pattern refresh token request');
    return this.authService.refreshToken(body.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('verify')
  @HttpCode(HttpStatus.OK)
  verify(@CurrentUser() user: any) {
    this.logger.debug(`HTTP verify request for user: ${user.email}`);
    return { status: 'ok', user };
  }

  @MessagePattern(MessagePatterns.auth_validate)
  async verifyMessagePattern(user: any) {
    this.logger.debug(`Message pattern verify request for user: ${user.email}`);
    return { status: 'ok', user };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @HttpCode(HttpStatus.OK)
  getProfile(@CurrentUser() user: any) {
    this.logger.debug(`HTTP profile request for user: ${user.email}`);
    return user;
  }

  @MessagePattern(MessagePatterns.auth_profile)
  async getProfileMessagePattern(user: any) {
    this.logger.debug(
      `Message pattern profile request for user: ${user.email}`,
    );
    return user;
  }
}
