import { RabbitQueues } from '@app/common';
import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { AuthModule } from './auth.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AuthModule);

  app.enableCors();
  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Auth Service API')
    .setDescription(
      'Authentication and Authorization Service API Documentation',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Access Token',
        description: 'Enter access token',
        in: 'header',
      },
      'access-token',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Refresh Token',
        description: 'Enter refresh token',
        in: 'header',
      },
      'refresh-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/auth/docs', app, document);

  app.connectMicroservice({
    transport: Transport.RMQ,
    options: {
      urls: [
        `amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASSWORD}@${process.env.RABBITMQ_HOST}:${process.env.RABBITMQ_PORT}`,
      ],
      queue: RabbitQueues.microservices_auth_queue,
      queueOptions: {
        durable: true,
      },
      prefetchCount: 1,
    },
  });

  await app.startAllMicroservices();
  await app.listen(3000, '0.0.0.0');

  console.log(`Auth service is running on: ${await app.getUrl()}`);
  console.log(
    `Swagger documentation is available at: ${await app.getUrl()}/api/auth/docs`,
  );
}

bootstrap().catch((error) => {
  console.error('Failed to start auth service: ', error);
  process.exit(1);
});
