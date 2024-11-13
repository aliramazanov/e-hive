import { QueueName, VirtualHost } from '@app/common';
import { PostgresModule } from '@app/postgres';
import { RabbitMQModule } from '@app/rabbitmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEntity } from './entity/event.entity';
import { EventController } from './event.controller';
import { EventService } from './event.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PostgresModule,
    PostgresModule.forFeature([EventEntity]),
    RabbitMQModule.register([
      {
        name: QueueName.booking,
        vhost: VirtualHost.booking,
      },
    ]),
  ],
  controllers: [EventController],
  providers: [EventService],
})
export class EventModule {}
