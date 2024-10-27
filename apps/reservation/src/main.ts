import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ReservationModule } from './reservation.module';

async function bootstrap() {
  const app = await NestFactory.create(ReservationModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  await app.listen(3000);
}
bootstrap();
