import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AuthModule } from './auth.module';

async function bootstrap() {
  const app = await NestFactory.create(AuthModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL],
      queue: 'auth_queue',
      queueOptions: {
        durable: true,
      },
      noAck: false,
      persistent: true,
      prefetchCount: 1,
    },
  });

  await app.startAllMicroservices();
  await app.listen(3000);

  console.log(`Auth service is running on port 3000`);
  console.log(`RabbitMQ connection URL: ${process.env.RABBITMQ_URL}`);
}

bootstrap().catch((error) => {
  console.error('Failed to start auth service:', error);
  process.exit(1);
});
