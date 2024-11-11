import { NestFactory } from '@nestjs/core';
import { BookingModule } from './booking.module';

async function bootstrap() {
  const app = await NestFactory.create(BookingModule);
  app.enableCors();
  app.setGlobalPrefix('api');
  await app.listen(3001, '0.0.0.0');
  console.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap().catch((error) => {
  console.error('Failed to start auth service: ', error);
  process.exit(1);
});
