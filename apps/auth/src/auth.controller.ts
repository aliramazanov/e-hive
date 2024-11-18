import { MessagePatterns } from '@app/common';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Public } from './guards/public.decorator';
import { JwtService } from '@nestjs/jwt';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() createUserDto: { email: string; password: string }) {
    this.logger.debug(`Register request for email: ${createUserDto.email}`);
    return this.authService.register(createUserDto);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() body: { token: string }) {
    this.logger.debug('Email verification request received');
    return this.authService.verifyEmail(body.token);
  }

  @MessagePattern(MessagePatterns.auth_register)
  async registerMessagePattern(createUserDto: {
    email: string;
    password: string;
  }) {
    return this.authService.register(createUserDto);
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@CurrentUser() user: any) {
    this.logger.debug(`Login request for user: ${user.email}`);
    return this.authService.login(user);
  }

  @MessagePattern(MessagePatterns.auth_login)
  async loginMessagePattern(user: any) {
    return this.authService.login(user);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() body: { refreshToken: string }) {
    return this.authService.refreshToken(body.refreshToken);
  }

  @MessagePattern(MessagePatterns.auth_refresh)
  async refreshTokenMessagePattern(body: { refreshToken: string }) {
    return this.authService.refreshToken(body.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('verify')
  @HttpCode(HttpStatus.OK)
  verify(@CurrentUser() user: any) {
    this.logger.debug(`Verify credentials request for user: ${user.email}`);
    return { status: 'ok', user };
  }

  @MessagePattern(MessagePatterns.auth_verify)
  async verifyMessagePattern(user: any) {
    return { status: 'ok', user };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @HttpCode(HttpStatus.OK)
  getProfile(@CurrentUser() user: any) {
    this.logger.debug(`Profile data request for user: ${user.email}`);
    return user;
  }

  @MessagePattern(MessagePatterns.auth_profile)
  async getProfileMessagePattern(user: any) {
    return user;
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: { email: string }) {
    this.logger.debug(`Password reset request for email: ${body.email}`);
    await this.authService.initiatePasswordReset(body.email);
    return { message: 'If the email exists, a reset link has been sent' };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    this.logger.debug('Password reset request received');
    return this.authService.resetPassword(body.token, body.newPassword);
  }

  @Public()
  @Get('validate')
  @HttpCode(HttpStatus.OK)
  async validateToken(@Req() request: Request) {
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException();
    }

    const token = authHeader.split(' ')[1];
    try {
      const payload = await this.jwtService.verify(token);
      return { valid: true, user: payload };
    } catch {
      throw new UnauthorizedException();
    }
  }
}
