import { RabbitMQService } from '@app/rabbitmq';
import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { EmailService } from './email/email.service';
import { Auth } from './entity/auth.entity';
import { MessagePatterns } from '@app/common';

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
        this.logger.warn(`Email already registered: ${createUserDto.email}`);
        throw new ConflictException('Email already registered');
      }

      const userId = await this.rmqService.send(MessagePatterns.user_create, {
        email: createUserDto.email,
      });

      if (!userId) {
        this.logger.error(`Failed to create user in user service ${userId}`);
        throw new InternalServerErrorException('Failed to create user');
      }

      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
      const emailVerificationToken = randomBytes(32).toString('hex');

      const auth = this.authRepository.create({
        email: createUserDto.email,
        password: hashedPassword,
        userId,
        emailVerificationToken,
        isEmailVerified: false,
      });

      await this.authRepository.save(auth);

      await this.emailService.sendVerificationEmail(
        auth.email,
        emailVerificationToken,
      );

      this.logger.debug(`Registration successful for: ${createUserDto.email}`);

      return this.login(auth);
    } catch (error) {
      this.logger.error(`Registration failed: ${error.message}`, error.stack);

      if (!(error instanceof ConflictException)) {
        try {
          await this.rmqService.publish(
            MessagePatterns.user_regstration_failed,
            {
              email: createUserDto.email,
              error: error.message,
            },
          );
        } catch (publishError) {
          this.logger.error(
            `Failed to publish registration failure event: ${publishError.message}`,
            publishError.stack,
          );
        }
      }

      if (
        error instanceof ConflictException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      throw new InternalServerErrorException('Registration failed');
    }
  }

  async verifyEmail(token: string): Promise<boolean> {
    this.logger.debug('Processing email verification');

    try {
      const auth = await this.authRepository.findOne({
        where: { emailVerificationToken: token },
      });

      if (!auth) {
        this.logger.warn('Invalid verification token');
        throw new UnauthorizedException('Invalid verification token');
      }

      auth.emailVerificationToken = null;
      auth.isEmailVerified = true;
      await this.authRepository.save(auth);

      this.logger.debug(`Email verified successfully for: ${auth.email}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Email verification failed: ${error.message}`,
        error.stack,
      );
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
      });

      this.logger.debug(`Login successful for user: ${user.email}`);

      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        user: {
          id: user.userId,
          email: user.email,
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

    if (auth && (await bcrypt.compare(password, auth.password))) {
      const { password, ...result } = auth;
      this.logger.debug(`User validated successfully: ${email}`);
      return result;
    }

    this.logger.debug(`User validation failed: ${email}`);
    return null;
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

  async initiatePasswordReset(email: string): Promise<void> {
    this.logger.debug(`Processing password reset request for: ${email}`);

    try {
      const auth = await this.authRepository.findOne({ where: { email } });

      if (!auth) {
        this.logger.debug(`No account found for email: ${email}`);
        return; // Don't reveal whether the email exists
      }

      const resetToken = randomBytes(32).toString('hex');
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + 1); // Token expires in 1 hour

      auth.passwordResetToken = resetToken;
      auth.passwordResetTokenExpiry = expiry;
      await this.authRepository.save(auth);

      await this.emailService.sendPasswordResetEmail(email, resetToken);

      this.logger.debug(`Password reset email sent to: ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to initiate password reset: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to process password reset',
      );
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    this.logger.debug('Processing password reset');

    try {
      const auth = await this.authRepository.findOne({
        where: { passwordResetToken: token },
      });

      if (!auth || !auth.passwordResetTokenExpiry) {
        this.logger.warn('Invalid password reset token');
        throw new UnauthorizedException('Invalid password reset token');
      }

      if (new Date() > auth.passwordResetTokenExpiry) {
        this.logger.warn('Password reset token expired');
        throw new UnauthorizedException('Password reset token has expired');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      auth.password = hashedPassword;
      auth.passwordResetToken = null;
      auth.passwordResetTokenExpiry = null;
      await this.authRepository.save(auth);

      this.logger.debug(`Password reset successful for: ${auth.email}`);
      return true;
    } catch (error) {
      this.logger.error(`Password reset failed: ${error.message}`, error.stack);
      throw error;
    }
  }
}
