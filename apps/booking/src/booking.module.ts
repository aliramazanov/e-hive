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
    RabbitMQModule.register('user_queue'),
    RabbitMQModule.register('event_queue'),
  ],
  controllers: [BookingController],
  providers: [BookingService],
})
export class BookingModule {}
