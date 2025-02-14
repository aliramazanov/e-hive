import { RabbitQueues } from '@app/common';
import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { BookingModule } from './booking.module';

async function bootstrap() {
  const app = await NestFactory.create(BookingModule);

  app.enableCors();
  app.setGlobalPrefix('api');

  app.connectMicroservice({
    transport: Transport.RMQ,
    options: {
      urls: [
        `amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASSWORD}@${process.env.RABBITMQ_HOST}:${process.env.RABBITMQ_PORT}`,
      ],
      queue: RabbitQueues.microservices_booking_queue,
      queueOptions: {
        durable: true,
      },
      prefetchCount: 1,
    },
  });

  await app.startAllMicroservices();
  await app.listen(3001, '0.0.0.0');
  console.log(`Booking service is running on: ${await app.getUrl()}`);
}

bootstrap().catch((error) => {
  console.error('Failed to start booking service: ', error);
  process.exit(1);
});
