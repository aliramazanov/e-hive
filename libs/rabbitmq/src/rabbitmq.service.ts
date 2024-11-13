import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { ModuleRef } from '@nestjs/core';
import { QueueName } from '@app/common';

@Injectable()
export class RabbitMQService {
  private readonly logger = new Logger(RabbitMQService.name);
  private readonly maxRetries = 3;
  private readonly clients: Map<string, ClientProxy> = new Map();

  constructor(private moduleRef: ModuleRef) {
    this.logger.debug('RabbitMQService initialized');
  }

  private async getClient(pattern: string): Promise<ClientProxy> {
    const clientName = this.getClientName(pattern);

    if (!this.clients.has(clientName)) {
      try {
        const client = this.moduleRef.get(`RABBITMQ_CLIENT_${clientName}`, {
          strict: false,
        });
        if (client) {
          this.clients.set(clientName, client);
        }
      } catch (error) {
        this.logger.error(`Failed to get client for pattern ${pattern}`, error);
      }
    }

    const client = this.clients.get(clientName);
    if (!client) {
      throw new Error(`No client found for pattern: ${pattern}`);
    }

    return client;
  }

  private getClientName(pattern: string): string {
    if (pattern.startsWith('user.')) {
      return QueueName.user;
    }
    if (pattern.startsWith('event.')) {
      return QueueName.event;
    }
    if (pattern.startsWith('booking.')) {
      return QueueName.booking;
    }
    if (pattern.startsWith('auth.')) {
      return QueueName.auth;
    }

    throw new Error(`Unknown pattern prefix: ${pattern}`);
  }

  async send(pattern: string, data: any): Promise<any> {
    let retries = 0;

    while (retries < this.maxRetries) {
      try {
        const client = await this.getClient(pattern);
        await client.connect();

        this.logger.debug(
          `[Attempt ${retries + 1}] Sending message to pattern: ${pattern}`,
        );
        this.logger.debug('Data:', JSON.stringify(data));

        const response$ = client.send(pattern, data).pipe(timeout(5000));
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
      const client = await this.getClient(pattern);

      this.logger.debug(`Publishing event to pattern: ${pattern}`);
      this.logger.debug('Event data:', JSON.stringify(data));

      await client.connect();
      client.emit(pattern, data);

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
