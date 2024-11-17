import { MessagePatterns } from '@app/common';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import {
  ChangePasswordDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
  ResetPasswordRequestDto,
  UpdateEmailDto,
} from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Public } from './guards/public.decorator';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() createUserDto: RegisterDto) {
    this.logger.debug(`Register request for email: ${createUserDto.email}`);
    return this.authService.register(createUserDto);
  }

  @MessagePattern(MessagePatterns.auth_register)
  async registerMessagePattern(createUserDto: RegisterDto) {
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
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @MessagePattern(MessagePatterns.auth_refresh)
  async refreshTokenMessagePattern(dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
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

  @UseGuards(JwtAuthGuard)
  @Put('password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: any,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.userId, dto);
  }

  @MessagePattern(MessagePatterns.auth_change_password)
  async changePasswordMessagePattern(data: {
    userId: string;
    dto: ChangePasswordDto;
  }) {
    return this.authService.changePassword(data.userId, data.dto);
  }

  @Public()
  @Post('password/reset-request')
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(@Body() dto: ResetPasswordRequestDto) {
    return this.authService.requestPasswordReset(dto);
  }

  @MessagePattern(MessagePatterns.auth_request_password_reset)
  async requestPasswordResetMessagePattern(dto: ResetPasswordRequestDto) {
    return this.authService.requestPasswordReset(dto);
  }

  @Public()
  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @MessagePattern(MessagePatterns.auth_reset_password)
  async resetPasswordMessagePattern(dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('email')
  @HttpCode(HttpStatus.OK)
  async updateEmail(@CurrentUser() user: any, @Body() dto: UpdateEmailDto) {
    return this.authService.updateEmail(user.userId, dto);
  }

  @MessagePattern(MessagePatterns.auth_update_email)
  async updateEmailMessagePattern(data: {
    userId: string;
    dto: UpdateEmailDto;
  }) {
    return this.authService.updateEmail(data.userId, data.dto);
  }

  @Public()
  @Get('verify-email/:token')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Param('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @MessagePattern(MessagePatterns.auth_verify_email)
  async verifyEmailMessagePattern(token: string) {
    return this.authService.verifyEmail(token);
  }
}
