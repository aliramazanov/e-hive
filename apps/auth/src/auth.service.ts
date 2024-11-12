import { RabbitMQService } from '@app/rabbitmq';
import {
  ConflictException,
  Injectable,
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

      await this.authRepository
        .update(user.id, {
          refreshToken: hashedRefreshToken,
        })
        .catch((error) => {
          this.logger.error(`Failed to update refresh token: ${error.message}`);
          throw new Error('Login failed');
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
      this.logger.error(`Login failed: ${error.message}`);
      throw error;
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

      const userId = await this.rmqService.send('create_user', {
        email: createUserDto.email,
      });

      if (!userId) {
        throw new Error('Failed to create user');
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
      if (error.message !== 'Email already registered') {
        await this.rmqService.publish('user.registration.failed', {
          email: createUserDto.email,
        });
      }
      throw error;
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
        throw new UnauthorizedException();
      }

      return this.login(auth);
    } catch {
      throw new UnauthorizedException();
    }
  }
}
