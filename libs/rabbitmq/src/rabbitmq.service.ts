import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';

export class RabbitMQService {
  private readonly logger = new Logger(RabbitMQService.name);
  private readonly maxRetries = 3;

  constructor(
    @Inject('RABBITMQ_CLIENT')
    private readonly client: ClientProxy,
  ) {
    this.logger.debug('RabbitMQService initialized with client:', {
      client: this.client,
    });
  }

  async send(pattern: string, data: any): Promise<any> {
    let retries = 0;

    while (retries < this.maxRetries) {
      try {
        const connection = await this.client.connect();
        this.logger.debug('Connection details:', {
          connection,
          pattern,
          queue: (this.client as any).options?.queue,
        });

        this.logger.debug(
          `[Attempt ${retries + 1}] Sending message to pattern: ${pattern}`,
        );
        this.logger.debug('Data:', JSON.stringify(data));

        const response$ = this.client.send(pattern, data).pipe(timeout(5000));

        this.logger.debug('Response observable created:', response$);

        const response = await firstValueFrom(response$);

        this.logger.debug('Raw response received:', response);

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
            clientDetails: (this.client as any).options,
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
