import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ReservationModule } from './reservation.module';

async function bootstrap() {
  const app = await NestFactory.create(ReservationModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  const configService = app.get(ConfigService);
  await app.listen(configService.get('PORT'));
}
bootstrap();
