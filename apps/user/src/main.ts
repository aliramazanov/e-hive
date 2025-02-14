import { RabbitQueues } from '@app/common';
import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { UserModule } from './user.module';

async function bootstrap() {
  const app = await NestFactory.create(UserModule);

  app.enableCors();
  app.setGlobalPrefix('api');

  app.connectMicroservice({
    transport: Transport.RMQ,
    options: {
      urls: [
        `amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASSWORD}@${process.env.RABBITMQ_HOST}:${process.env.RABBITMQ_PORT}`,
      ],
      queue: RabbitQueues.microservices_user_queue,
      queueOptions: {
        durable: true,
      },
      prefetchCount: 1,
    },
  });

  await app.startAllMicroservices();
  await app.listen(3003, '0.0.0.0');
  console.log(`User service is running on: ${await app.getUrl()}`);
}

bootstrap().catch((error) => {
  console.error('Failed to start user service: ', error);
  process.exit(1);
});
