import { MessagePatterns } from '@app/common';
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
import { AuthUser } from './decorators/current-user.decorator';
import { EmailService } from './email/email.service';
import { Auth } from './entity/auth.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly operation_timeout = 10000;
  private readonly hash_rounds = 10;

  constructor(
    @InjectRepository(Auth)
    private readonly authRepository: Repository<Auth>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly rmqService: RabbitMQService,
    private readonly emailService: EmailService,
  ) {}

  private mapAuthToAuthUser(auth: Auth): AuthUser {
    return {
      id: auth.id,
      userId: auth.userId,
      email: auth.email,
    };
  }

  private async timeoutPromise<T>(
    promise: Promise<T>,
    timeoutMs: number,
    operation: string,
  ): Promise<T> {
    let timeoutId: NodeJS.Timeout;

    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(
          new Error(`${operation} operation timed out after ${timeoutMs}ms`),
        );
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timeoutId);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async register(createUserDto: { email: string; password: string }) {
    this.logger.debug(`Processing register for email: ${createUserDto.email}`);
    const startTime = Date.now();

    try {
      const existingAuth = await this.timeoutPromise(
        this.authRepository.findOne({
          where: { email: createUserDto.email },
        }),
        this.operation_timeout,
        'Check existing user',
      );

      if (existingAuth) {
        this.logger.warn(`Email already registered: ${createUserDto.email}`);
        throw new ConflictException('Email already registered');
      }

      const [hashedPassword, userId] = await Promise.all([
        this.timeoutPromise(
          bcrypt.hash(createUserDto.password, this.hash_rounds),
          this.operation_timeout,
          'Password hashing',
        ),
        this.timeoutPromise(
          this.rmqService.send(MessagePatterns.user_create, {
            email: createUserDto.email,
          }),
          this.operation_timeout,
          'User creation',
        ),
      ]);

      if (!userId) {
        this.logger.error(`Failed to create user in user service`);
        throw new InternalServerErrorException('Failed to create user');
      }

      const emailVerificationToken = randomBytes(32).toString('hex');

      const auth = this.authRepository.create({
        email: createUserDto.email,
        password: hashedPassword,
        userId,
        emailVerificationToken,
        isEmailVerified: false,
      });

      const savedAuth = await this.timeoutPromise(
        this.authRepository.save(auth),
        this.operation_timeout,
        'Save auth record',
      );

      setImmediate(() => {
        this.emailService
          .sendVerificationEmail(auth.email, emailVerificationToken)
          .catch((error) => {
            this.logger.error(
              `Failed to send verification email: ${error.message}`,
              error.stack,
            );
          });
      });

      const timeTaken = Date.now() - startTime;
      this.logger.debug(
        `Registration successful for: ${createUserDto.email}. Time taken: ${timeTaken}ms`,
      );

      return this.login(savedAuth);
    } catch (error) {
      const timeTaken = Date.now() - startTime;
      this.logger.error(
        `Registration failed after ${timeTaken}ms: ${error.message}`,
        error.stack,
      );

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

      throw new InternalServerErrorException(
        'Registration failed. Please try again later.',
      );
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

  async login(userOrAuth: Auth | AuthUser) {
    const startTime = Date.now();
    this.logger.debug(`Processing login for user: ${userOrAuth.email}`);

    try {
      const user: AuthUser =
        'userId' in userOrAuth
          ? (userOrAuth as AuthUser)
          : this.mapAuthToAuthUser(userOrAuth as Auth);

      const payload = {
        email: user.email,
        sub: user.id,
        userId: user.userId,
      };

      const [accessToken, refreshToken] = await Promise.all([
        this.timeoutPromise(
          this.jwtService.signAsync(payload),
          this.operation_timeout,
          'Generate access token',
        ),
        this.timeoutPromise(
          this.jwtService.signAsync(payload, {
            secret: this.configService.get('REFRESH_TOKEN_SECRET'),
            expiresIn: this.configService.get('REFRESH_TOKEN_EXPIRATION'),
          }),
          this.operation_timeout,
          'Generate refresh token',
        ),
      ]);

      const hashedRefreshToken = await this.timeoutPromise(
        bcrypt.hash(refreshToken, this.hash_rounds),
        this.operation_timeout,
        'Hash refresh token',
      );

      await this.timeoutPromise(
        this.authRepository.update(payload.sub, {
          refreshToken: hashedRefreshToken,
        }),
        this.operation_timeout,
        'Update refresh token',
      );

      const timeTaken = Date.now() - startTime;
      this.logger.debug(
        `Login successful for user: ${user.email}. Time taken: ${timeTaken}ms`,
      );

      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        user: {
          id: user.id,
          userId: user.userId,
          email: user.email,
        },
      };
    } catch (error) {
      const timeTaken = Date.now() - startTime;
      this.logger.error(
        `Login failed after ${timeTaken}ms: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Login failed. Please try again.');
    }
  }

  async validateUser(
    email: string,
    password: string,
  ): Promise<AuthUser | null> {
    this.logger.debug(`Validating user: ${email}`);
    const auth = await this.authRepository.findOne({ where: { email } });

    if (auth && (await bcrypt.compare(password, auth.password))) {
      const { password: _, ...result } = auth;
      this.logger.debug(`User validated successfully: ${email}`);

      return this.mapAuthToAuthUser(auth);
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
        return;
      }

      const resetToken = randomBytes(32).toString('hex');
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + 1);

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
