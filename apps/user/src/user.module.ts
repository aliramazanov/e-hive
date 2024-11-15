import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PostgresModule } from '@app/postgres';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from './entity/user.entity';
import { RabbitMQModule } from '@app/rabbitmq';
import { RabbitQueues } from '@app/common';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PostgresModule,
    PostgresModule.forFeature([User]),
    RabbitMQModule.register(RabbitQueues.microservices_event_queue),
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
