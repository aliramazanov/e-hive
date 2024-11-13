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
import { Repository } from 'typeorm';
import { Auth } from './entity/auth.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(Auth)
    private readonly authRepository: Repository<Auth>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly rmqService: RabbitMQService,
  ) {}

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

  async register(createUserDto: { email: string; password: string }) {
    this.logger.debug(
      `Processing registration for email: ${createUserDto.email}`,
    );
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
        this.logger.error('Failed to create user in user service');
        throw new InternalServerErrorException('Failed to create user');
      }

      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

      const auth = this.authRepository.create({
        email: createUserDto.email,
        password: hashedPassword,
        userId,
      });

      await this.authRepository.save(auth);
      this.logger.debug(
        `Registration successful for email: ${createUserDto.email}`,
      );

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

  async refreshToken(refreshToken: string) {
    this.logger.debug('Processing token refresh');
    try {
      const decoded = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('REFRESH_TOKEN_SECRET'),
      });

      const auth = await this.authRepository.findOne({
        where: { id: decoded.sub },
      });

      if (!auth || !(await bcrypt.compare(refreshToken, auth.refreshToken))) {
        this.logger.warn('Invalid refresh token attempt');
        throw new UnauthorizedException('Invalid refresh token');
      }

      this.logger.debug(`Token refresh successful for user: ${auth.email}`);
      return this.login(auth);
    } catch (error) {
      this.logger.error(`Token refresh failed: ${error.message}`, error.stack);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
