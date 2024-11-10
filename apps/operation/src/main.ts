import { NestFactory } from '@nestjs/core';
import { OperationModule } from './operation.module';

async function bootstrap() {
  const app = await NestFactory.create(OperationModule);
  app.enableCors();
  await app.listen(3003, '0.0.0.0');  
  console.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap().catch((error) => {
  console.error('Failed to start auth service: ', error);
  process.exit(1);
});
