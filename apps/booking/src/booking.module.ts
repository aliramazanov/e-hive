import { Module } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { Booking } from './entity/booking.entity';
import { PostgresModule, RabbitMQModule } from '@app/common';

@Module({
  imports: [
    PostgresModule,
    PostgresModule.forFeature([Booking]),
    RabbitMQModule,
  ],
  controllers: [BookingController],
  providers: [BookingService],
})
export class BookingModule {}
