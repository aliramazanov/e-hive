import { LoggerModule, MongoModule } from '@app/common';
import { Module } from '@nestjs/common';
import {
  ReservationDocument,
  ReservationSchema,
} from './model/reservation.schema';
import { ReservationController } from './reservation.controller';
import { ReservationRepository } from './reservation.repository';
import { ReservationService } from './reservation.service';

@Module({
  imports: [
    MongoModule,
    MongoModule.forFeature([
      { name: ReservationDocument.name, schema: ReservationSchema },
    ]),
    LoggerModule,
  ],
  controllers: [ReservationController],
  providers: [ReservationService, ReservationRepository],
})
export class ReservationModule {}
