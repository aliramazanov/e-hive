import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Payload, RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { JwtPayload } from './definition/jwt-payload.interface';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { User } from './entity/user.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async createUser(authCredentialsDto: AuthCredentialsDto): Promise<void> {
    const { username, password } = authCredentialsDto;

    const salt = await bcrypt.genSalt();
    const securePassword = await bcrypt.hash(password, salt);

    try {
      const user = this.userRepository.create({ username, securePassword });
      await this.userRepository.save(user);
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('This username has been taken');
      } else {
        throw new InternalServerErrorException();
      }
    }
  }

  async signIn(
    authCredentialsDto: AuthCredentialsDto,
  ): Promise<{ token: string }> {
    const { username, password } = authCredentialsDto;

    const user = await this.userRepository.findOne({ where: { username } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const passwordMatch = await bcrypt.compare(password, user.securePassword);

    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = { username };
    const token = this.jwtService.sign(payload);

    return { token };
  }

  async validateToken(@Payload() payload: { token: string }) {
    this.logger.debug(
      `Received token validation request: ${payload.token.substring(0, 10)}...`,
    );

    try {
      if (!payload?.token) {
        this.logger.warn('Token validation failed: No token provided');
        throw new RpcException('Token is required');
      }

      const decoded = await this.jwtService.verifyAsync<JwtPayload>(
        payload.token,
        {
          ignoreExpiration: false,
        },
      );

      this.logger.debug(
        `Token decoded successfully for username: ${decoded.username}`,
      );

      const user = await this.userRepository.findOne({
        where: { username: decoded.username },
        select: ['id', 'username'],
      });

      if (!user) {
        this.logger.warn(`User not found for username: ${decoded.username}`);
        throw new RpcException('User not found');
      }

      this.logger.debug(
        `Token validation successful for user: ${user.username}`,
      );

      return user;
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      this.logger.error('Token validation failed', {
        error: error.message,
        stack: error.stack,
        token: payload?.token
          ? `${payload.token.substring(0, 10)}...`
          : 'undefined',
      });

      if (error?.name === 'TokenExpiredError') {
        throw new RpcException('Token has expired');
      }

      if (error?.name === 'JsonWebTokenError') {
        throw new RpcException('Invalid token format');
      }

      throw new RpcException('Invalid token');
    }
  }
}
