import { NestFactory } from '@nestjs/core';
import { AuthModule } from './auth.module';
import { LoggerModule } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AuthModule);
  app.useLogger(app.get(LoggerModule));
  await app.listen(3001);
}
bootstrap();
