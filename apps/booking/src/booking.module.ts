import { JwtAuthGuard, PostgresModule, RabbitMQModule } from '@app/common';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { Booking } from './entity/booking.entity';
import { BookingRepository } from './repository/booking.repository';

@Module({
  imports: [
    PostgresModule,
    PostgresModule.forFeature([Booking]),
    RabbitMQModule,
    ClientsModule.registerAsync([
      {
        name: 'AUTH_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URL')],
            queue: 'auth_queue',
            queueOptions: {
              durable: true,
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [BookingController],
  providers: [
    BookingRepository,
    BookingService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class BookingModule {}
