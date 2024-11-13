import { QueueName, VirtualHost } from '@app/common';
import { PostgresModule } from '@app/postgres';
import { RabbitMQModule } from '@app/rabbitmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { Booking } from './entity/booking.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PostgresModule,
    PostgresModule.forFeature([Booking]),
    RabbitMQModule.register([
      {
        name: QueueName.user,
        vhost: VirtualHost.user,
      },
      {
        name: QueueName.event,
        vhost: VirtualHost.event,
      },
    ]),
  ],
  controllers: [BookingController],
  providers: [BookingService],
})
export class BookingModule {}
