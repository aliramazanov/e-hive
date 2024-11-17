import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { MoreThan, Repository } from 'typeorm';
import {
  ChangePasswordDto,
  ResetPasswordDto,
  ResetPasswordRequestDto,
  UpdateEmailDto,
} from './dto/register.dto';
import { Auth } from './entity/auth.entity';
import { MessagePatterns } from '@app/common';
import { RabbitMQService } from '@app/rabbitmq';
import { EmailService } from './email/email.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(Auth)
    private readonly authRepository: Repository<Auth>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly rmqService: RabbitMQService,
    private readonly emailService: EmailService,
  ) {}

  async register(createUserDto: { email: string; password: string }) {
    this.logger.debug(`Processing register for email: ${createUserDto.email}`);

    try {
      const existingAuth = await this.authRepository.findOne({
        where: { email: createUserDto.email },
      });

      if (existingAuth) {
        this.logger.warn(
          `Email already used for registration: ${createUserDto.email}`,
        );
        throw new ConflictException('Email already used for registration');
      }

      const userId = await this.rmqService.send(MessagePatterns.user_create, {
        email: createUserDto.email,
      });

      if (!userId) {
        this.logger.error(`Failed to create user in user service ${userId}`);
        throw new InternalServerErrorException('Failed to create user');
      }

      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
      const emailVerificationToken = randomUUID();

      const auth = this.authRepository.create({
        email: createUserDto.email,
        password: hashedPassword,
        userId,
        emailVerificationToken,
        emailVerified: false,
      });

      await this.authRepository.save(auth);

      const emailSent = await this.emailService.sendVerificationEmail(
        createUserDto.email,
        emailVerificationToken,
      );

      if (!emailSent) {
        this.logger.warn(
          `Failed to send verification email to: ${createUserDto.email}`,
        );
      }

      this.logger.debug(`Registration successful for: ${createUserDto.email}`);

      return this.login(auth);
    } catch (error) {
      this.logger.error(`Registration failed: ${error.message}`, error.stack);

      if (!(error instanceof ConflictException)) {
        await this.rmqService.publish('user.registration.failed', {
          email: createUserDto.email,
          error: error.message,
        });
      }

      throw error;
    }
  }

  async login(user: any) {
    this.logger.debug(`Processing login for user: ${user.email}`);

    try {
      const payload = { email: user.email, sub: user.id };

      const accessToken = this.jwtService.sign(payload);
      const refreshToken = this.jwtService.sign(payload, {
        secret: this.configService.get('REFRESH_TOKEN_SECRET'),
        expiresIn: this.configService.get('REFRESH_TOKEN_EXPIRATION'),
      });

      const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

      await this.authRepository.update(user.id, {
        refreshToken: hashedRefreshToken,
        securityLog: {
          lastLoginAt: new Date(),
          lastIp: user.ip || null,
          lastUserAgent: user.userAgent || null,
          failedLoginAttempts: 0,
        },
      });

      this.logger.debug(`Login successful for user: ${user.email}`);

      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        user: {
          id: user.userId,
          email: user.email,
          emailVerified: user.emailVerified,
        },
      };
    } catch (error) {
      this.logger.error(`Login failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Login failed');
    }
  }

  async validateUser(email: string, password: string): Promise<any> {
    this.logger.debug(`Validating user: ${email}`);
    const auth = await this.authRepository.findOne({ where: { email } });

    if (!auth) {
      this.logger.debug(`User not found: ${email}`);
      return null;
    }

    const isValid = await bcrypt.compare(password, auth.password);

    if (!isValid) {
      const currentSecurityLog = auth.securityLog || {};
      await this.authRepository.update(auth.id, {
        securityLog: {
          ...currentSecurityLog,
          lastFailedLogin: new Date(),
          failedLoginAttempts:
            (currentSecurityLog.failedLoginAttempts || 0) + 1,
        },
      });

      this.logger.debug(`Invalid password for user: ${email}`);
      return null;
    }

    if (!auth.emailVerified) {
      this.logger.debug(`Unverified email for user: ${email}`);
      // Optionally resend verification email if needed
      const emailVerificationToken = randomUUID();
      auth.emailVerificationToken = emailVerificationToken;
      await this.authRepository.save(auth);

      await this.emailService.sendVerificationEmail(
        email,
        emailVerificationToken,
      );
    }

    const { password: _, ...result } = auth;
    this.logger.debug(`User validated successfully: ${email}`);
    return result;
  }

  async refreshToken(refreshToken: string) {
    try {
      const decoded = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('REFRESH_TOKEN_SECRET'),
      });

      const auth = await this.authRepository.findOne({
        where: { id: decoded.sub },
      });

      if (!auth || !(await bcrypt.compare(refreshToken, auth.refreshToken))) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return this.login(auth);
    } catch (error) {
      this.logger.error(`Token refresh failed: ${error.message}`, error.stack);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    this.logger.debug(`Processing password change for user: ${userId}`);

    const auth = await this.authRepository.findOne({ where: { userId } });
    if (!auth) {
      throw new NotFoundException('User not found');
    }

    const isValidPassword = await bcrypt.compare(
      dto.currentPassword,
      auth.password,
    );
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid current password');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    auth.password = hashedPassword;
    auth.lastPasswordChange = new Date();
    auth.refreshToken = null;

    await this.authRepository.save(auth);

    return { message: 'Password changed successfully' };
  }

  async requestPasswordReset(dto: ResetPasswordRequestDto) {
    const auth = await this.authRepository.findOne({
      where: { email: dto.email },
    });

    if (!auth) {
      return {
        message:
          'If your email is registered, you will receive reset instructions',
      };
    }

    const resetToken = randomUUID();
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    auth.passwordResetToken = resetToken;
    auth.passwordResetExpires = resetTokenExpiry;
    await this.authRepository.save(auth);

    const emailSent = await this.emailService.sendVerificationEmail(
      dto.email,
      resetToken,
    );

    if (!emailSent) {
      this.logger.warn(`Failed to send password reset email to: ${dto.email}`);
    }

    return {
      message:
        'If your email is registered, you will receive reset instructions',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const auth = await this.authRepository.findOne({
      where: {
        passwordResetToken: dto.token,
        passwordResetExpires: MoreThan(new Date()),
      },
    });

    if (!auth) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    auth.password = hashedPassword;
    auth.passwordResetToken = null;
    auth.passwordResetExpires = null;
    auth.lastPasswordChange = new Date();
    auth.refreshToken = null;

    await this.authRepository.save(auth);

    return { message: 'Password reset successful' };
  }

  async updateEmail(userId: string, dto: UpdateEmailDto) {
    const auth = await this.authRepository.findOne({ where: { userId } });
    if (!auth) {
      throw new NotFoundException('User not found');
    }

    const isValidPassword = await bcrypt.compare(dto.password, auth.password);
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid password');
    }

    const existingEmail = await this.authRepository.findOne({
      where: { email: dto.newEmail },
    });
    if (existingEmail) {
      throw new ConflictException('Email already in use');
    }

    auth.email = dto.newEmail;
    auth.emailVerified = false;
    auth.emailVerificationToken = randomUUID();

    await this.authRepository.save(auth);

    const emailSent = await this.emailService.sendVerificationEmail(
      dto.newEmail,
      auth.emailVerificationToken,
    );

    if (!emailSent) {
      this.logger.warn(
        `Failed to send verification email to new address: ${dto.newEmail}`,
      );
    }

    return {
      message: 'Email updated successfully. Please verify your new email.',
    };
  }

  async verifyEmail(token: string) {
    const auth = await this.authRepository.findOne({
      where: { emailVerificationToken: token },
    });

    if (!auth) {
      throw new UnauthorizedException('Invalid verification token');
    }

    auth.emailVerified = true;
    auth.emailVerificationToken = null;
    await this.authRepository.save(auth);

    return { message: 'Email verified successfully' };
  }

  async resendVerificationEmail(userId: string) {
    const auth = await this.authRepository.findOne({ where: { userId } });
    if (!auth) {
      throw new NotFoundException('User not found');
    }

    if (auth.emailVerified) {
      return { message: 'Email is already verified' };
    }

    const emailVerificationToken = randomUUID();
    auth.emailVerificationToken = emailVerificationToken;
    await this.authRepository.save(auth);

    const emailSent = await this.emailService.sendVerificationEmail(
      auth.email,
      emailVerificationToken,
    );

    if (!emailSent) {
      this.logger.warn(`Failed to resend verification email to: ${auth.email}`);
      throw new InternalServerErrorException(
        'Failed to send verification email',
      );
    }

    return { message: 'Verification email has been resent' };
  }
}
