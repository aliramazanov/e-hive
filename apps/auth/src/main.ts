import { Queue_Configurations, QueueName } from '@app/common';
import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { AuthModule } from './auth.module';

async function bootstrap() {
  const app = await NestFactory.create(AuthModule);
  const queueConfig = Queue_Configurations[QueueName.auth];

  app.enableCors();
  app.setGlobalPrefix('api');

  app.connectMicroservice({
    transport: Transport.RMQ,
    options: {
      urls: [
        `amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASSWORD}@${process.env.RABBITMQ_HOST}:${process.env.RABBITMQ_PORT}${queueConfig.vhost}`,
      ],
      queue: queueConfig.name,
      queueOptions: {
        durable: true,
      },
      prefetchCount: 1,
    },
  });

  await app.startAllMicroservices();
  await app.listen(3000, '0.0.0.0');
  console.log(`Auth service is running on: ${await app.getUrl()}`);
}

bootstrap().catch((error) => {
  console.error('Failed to start booking service: ', error);
  process.exit(1);
});
