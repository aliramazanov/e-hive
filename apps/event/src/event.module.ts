import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PostgresModule } from '@app/postgres';
import { EventController } from './event.controller';
import { EventService } from './event.service';
import { Event } from './entity/event.entity';
import { RabbitMQModule } from '@app/rabbitmq';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PostgresModule,
    PostgresModule.forFeature([Event]),
    RabbitMQModule.register('booking_queue'),
  ],
  controllers: [EventController],
  providers: [EventService],
})
export class EventModule {}
