import { QueueName, VirtualHost } from '@app/common';
import { PostgresModule } from '@app/postgres';
import { RabbitMQModule } from '@app/rabbitmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { User } from './entity/user.entity';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PostgresModule,
    PostgresModule.forFeature([User]),
    RabbitMQModule.register([
      {
        name: QueueName.event,
        vhost: VirtualHost.event,
      },
    ]),
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
