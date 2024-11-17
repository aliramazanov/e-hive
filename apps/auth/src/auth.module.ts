import { RabbitQueues } from '@app/common';
import { PostgresModule } from '@app/postgres';
import { RabbitMQModule } from '@app/rabbitmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import * as Joi from 'joi';
import * as path from 'path';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailModule } from './email/email.module';
import { Auth } from './entity/auth.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtStrategy } from './strategy/jwt.strategy';
import { LocalStrategy } from './strategy/local.strategy';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: path.join(process.cwd(), 'jwt.config.env'),
      validationSchema: Joi.object({
        JWT_SECRET: Joi.string().required(),
        JWT_EXPIRATION: Joi.string().required(),
        REFRESH_TOKEN_SECRET: Joi.string().required(),
        REFRESH_TOKEN_EXPIRATION: Joi.string().required(),
      }),
      expandVariables: true,
      cache: true,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    PostgresModule,
    PostgresModule.forFeature([Auth]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRATION'),
        },
      }),
      inject: [ConfigService],
    }),
    RabbitMQModule.register(RabbitQueues.microservices_user_queue),
    EmailModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AuthModule {}
