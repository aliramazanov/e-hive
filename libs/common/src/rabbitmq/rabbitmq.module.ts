import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'AUTH_SERVICE',
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => {
          const rabbitMqUrl = configService.get<string>('RABBITMQ_URL');

          if (!rabbitMqUrl) {
            throw new Error('RABBITMQ_URL is not defined');
          }

          return {
            transport: Transport.RMQ,
            options: {
              urls: [rabbitMqUrl],
              queue: 'auth_queue',
              queueOptions: {
                durable: true,
              },
              retryAttempts: 5,
              retryDelay: 5000,
              persistent: true,
            },
          };
        },
        inject: [ConfigService],
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class RabbitMQModule {}
