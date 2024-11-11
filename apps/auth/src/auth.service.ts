import { RabbitMQService } from '@app/rabbitmq';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
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
    const payload = { email: user.email, sub: user.id };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('REFRESH_TOKEN_SECRET'),
      expiresIn: this.configService.get('REFRESH_TOKEN_EXPIRATION'),
    });

    await this.authRepository.update(user.id, {
      refreshToken: await bcrypt.hash(refreshToken, 10),
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }

  async register(createUserDto: { email: string; password: string }) {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const userId = await this.rmqService.send('create_user', {
      email: createUserDto.email,
    });

    const auth = this.authRepository.create({
      email: createUserDto.email,
      password: hashedPassword,
      userId,
    });

    await this.authRepository.save(auth);
    return this.login(auth);
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
