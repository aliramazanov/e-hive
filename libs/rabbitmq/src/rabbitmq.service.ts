import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';

export class RabbitMQService {
  private readonly logger = new Logger(RabbitMQService.name);
  private readonly maxRetries = 3;

  constructor(
    @Inject('RABBITMQ_CLIENT')
    private readonly client: ClientProxy,
  ) {}

  async onModuleInit() {
    try {
      await this.client.connect();
      this.logger.log('Successfully connected to RabbitMQ');
    } catch (error) {
      this.logger.error(`Failed to connect to RabbitMQ: ${error.message}`);
      throw error;
    }
  }

  async send(pattern: string, data: any): Promise<any> {
    let retries = 0;

    while (retries < this.maxRetries) {
      try {
        this.logger.debug(
          `[Attempt ${retries + 1}] Sending message to pattern: ${pattern}`,
        );
        this.logger.debug('Data:', JSON.stringify(data));
        this.logger.debug('Client ready state:', await this.client.connect());

        const response$ = this.client.send(pattern, data).pipe(timeout(5000));

        const response = await firstValueFrom(response$);

        if (response === undefined || response === null) {
          throw new Error(
            `Received null/undefined response for pattern ${pattern}`,
          );
        }

        this.logger.debug(
          `Successfully received response for pattern ${pattern}:`,
          response,
        );
        return response;
      } catch (error) {
        retries++;
        this.logger.error(
          `Attempt ${retries}/${this.maxRetries} failed for pattern ${pattern}:`,
          {
            error: error.message,
            stack: error.stack,
            name: error.name,
            code: error?.code,
          },
        );

        if (retries === this.maxRetries) {
          throw error;
        }

        await new Promise((resolve) => setTimeout(resolve, 1000 * retries));
      }
    }
  }

  async publish(pattern: string, data: any): Promise<void> {
    try {
      this.logger.debug(`Publishing event to pattern: ${pattern}`);
      this.logger.debug('Event data:', JSON.stringify(data));

      await this.client.connect();
      this.client.emit(pattern, data);

      this.logger.debug(`Successfully published event to pattern: ${pattern}`);
    } catch (error) {
      this.logger.error(
        `Failed to publish event to pattern ${pattern}: ${error.message}`,
        {
          error: error.message,
          stack: error.stack,
          name: error.name,
          code: error?.code,
        },
      );
      throw error;
    }
  }
}
