import { NestFactory } from '@nestjs/core';
import { OperationModule } from './operation.module';

async function bootstrap() {
  const app = await NestFactory.create(OperationModule);
  await app.listen(3003);
  console.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap().catch((error) => {
  console.error('Failed to start auth service: ', error);
  process.exit(1);
});
