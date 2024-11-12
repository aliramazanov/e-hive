import { RabbitMQService } from '@app/rabbitmq';
import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
  InternalServerErrorException,
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
    const auth = await this.authRepository.findOne({ where: { email } });

    if (auth && (await bcrypt.compare(password, auth.password))) {
      const { password, ...result } = auth;
      return result;
    }

    return null;
  }

  async login(user: any) {
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
    try {
      const existingAuth = await this.authRepository.findOne({
        where: { email: createUserDto.email },
      });

      if (existingAuth) {
        throw new ConflictException('Email already registered');
      }

      const userId = await this.rmqService.send('user.create', {
        email: createUserDto.email,
      });

      if (!userId) {
        throw new InternalServerErrorException('Failed to create user');
      }

      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

      const auth = this.authRepository.create({
        email: createUserDto.email,
        password: hashedPassword,
        userId,
      });

      await this.authRepository.save(auth);

      return this.login(auth);
    } catch (error) {
      this.logger.error(`Registration failed: ${error.message}`, error.stack);

      if (!(error instanceof ConflictException)) {
        try {
          await this.rmqService.publish('user.registration.failed', {
            email: createUserDto.email,
            error: error.message,
          });
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
}
