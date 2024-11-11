import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import * as Joi from 'joi';
import { RabbitMQService } from './rabbitmq.service';

@Module({})
export class RabbitMQModule {
  static register(queue: string): DynamicModule {
    return {
      module: RabbitMQModule,
      imports: [
        ConfigModule.forRoot({
          validationSchema: Joi.object({
            RABBITMQ_USER: Joi.string().required(),
            RABBITMQ_PASSWORD: Joi.string().required(),
            RABBITMQ_HOST: Joi.string().required(),
            RABBITMQ_PORT: Joi.number().required(),
          }),
        }),
        ClientsModule.registerAsync([
          {
            name: 'RABBITMQ_CLIENT',
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
              transport: Transport.RMQ,
              options: {
                urls: [
                  `amqp://${configService.get<string>('RABBITMQ_USER')}:${configService.get<string>(
                    'RABBITMQ_PASSWORD',
                  )}@${configService.get<string>('RABBITMQ_HOST')}:${configService.get<string>('RABBITMQ_PORT')}`,
                ],
                queue,
                queueOptions: {
                  durable: true,
                },
                prefetchCount: 1,
              },
            }),
            inject: [ConfigService],
          },
        ]),
      ],
      providers: [RabbitMQService],
      exports: [RabbitMQService, ClientsModule],
    };
  }
}
