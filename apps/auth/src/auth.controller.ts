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
import { JwtService } from '@nestjs/jwt';
import { MessagePattern } from '@nestjs/microservices';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthUser, CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/auth-login.dto';
import { RegisterDto } from './dto/auth-register.dto';
import { TokenDto } from './dto/auth-token.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Public } from './guards/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() createUserDto: RegisterDto) {
    this.logger.debug(`Register request for email: ${createUserDto.email}`);
    return this.authService.register(createUserDto);
  }

  @ApiOperation({ summary: 'Verify email address' })
  @ApiResponse({ status: 200, description: 'Email successfully verified' })
  @ApiResponse({ status: 401, description: 'Invalid verification token' })
  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() body: TokenDto) {
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

  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Successfully logged in',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          userId: '123e4567-e89b-12d3-a456-426614174000',
          email: 'user@example.com',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    schema: {
      example: {
        statusCode: 401,
        message: 'Invalid email or password',
        error: 'Unauthorized',
      },
    },
  })
  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@CurrentUser() user: AuthUser) {
    return this.authService.login(user);
  }

  @MessagePattern(MessagePatterns.auth_login)
  async loginMessagePattern(user: AuthUser) {
    return this.authService.login(user);
  }

  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'Token successfully refreshed',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  @ApiBearerAuth('refresh-token')
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

  @ApiOperation({ summary: 'Verify JWT token' })
  @ApiResponse({ status: 200, description: 'Token is valid' })
  @ApiResponse({ status: 401, description: 'Invalid token' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get('verify')
  @HttpCode(HttpStatus.OK)
  verify(@CurrentUser() user: AuthUser) {
    this.logger.debug(`Verify credentials request for user: ${user.email}`);
    return { status: 'ok', user };
  }

  @MessagePattern(MessagePatterns.auth_verify)
  async verifyMessagePattern(user: AuthUser) {
    return { status: 'ok', user };
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'user@example.com',
      },
    },
  })
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @HttpCode(HttpStatus.OK)
  getProfile(@CurrentUser() user: AuthUser) {
    this.logger.debug(`Profile data request for user: ${user.id}`);
    return {
      id: user.id,
      userId: user.userId,
      email: user.email,
    };
  }

  @MessagePattern(MessagePatterns.auth_profile)
  async getProfileMessagePattern(user: AuthUser) {
    return user;
  }

  @ApiOperation({ summary: 'Initiate password reset' })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent if email exists',
  })
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: { email: string }) {
    this.logger.debug(`Password reset request for email: ${body.email}`);
    await this.authService.initiatePasswordReset(body.email);
    return { message: 'If the email exists, a reset link has been sent' };
  }

  @ApiOperation({ summary: 'Reset password' })
  @ApiResponse({ status: 200, description: 'Password successfully reset' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    this.logger.debug('Password reset request received');
    return this.authService.resetPassword(body.token, body.newPassword);
  }

  @ApiBearerAuth('access-token')
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
