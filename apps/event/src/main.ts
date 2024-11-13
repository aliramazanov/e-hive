import { Queue_Configurations, QueueName } from '@app/common';
import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { EventModule } from './event.module';

async function bootstrap() {
  const app = await NestFactory.create(EventModule);
  const queueConfig = Queue_Configurations[QueueName.event];

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
  await app.listen(3002, '0.0.0.0');

  console.log(`Event service is running on: ${await app.getUrl()}`);
}

bootstrap().catch((error) => {
  console.error('Failed to start event service: ', error);
  process.exit(1);
});
