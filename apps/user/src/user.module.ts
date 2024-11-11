import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PostgresModule } from '@app/postgres';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from './entity/user.entity';
import { RabbitMQModule } from '@app/rabbitmq';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PostgresModule,
    PostgresModule.forFeature([User]),
    RabbitMQModule.register('user_queue'),
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
