import { NestFactory } from '@nestjs/core';
import { FileModule } from './file.module';

async function bootstrap() {
  const app = await NestFactory.create(FileModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
