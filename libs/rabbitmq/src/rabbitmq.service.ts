import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';

@Injectable()
export class RabbitMQService {
  private readonly logger = new Logger(RabbitMQService.name);
  private readonly maxRetries = 3;

  constructor(
    @Inject('RABBITMQ_CLIENT')
    private readonly client: ClientProxy,
  ) {}

  async send(pattern: string, data: any): Promise<any> {
    let retries = 0;

    while (retries < this.maxRetries) {
      try {
        this.logger.debug(
          `Sending message to pattern: ${pattern} with data:`,
          data,
        );

        const response = await firstValueFrom(
          this.client.send(pattern, data).pipe(timeout(5000)),
        );

        this.logger.debug(
          `Received response from pattern ${pattern}:`,
          response,
        );
        return response;
      } catch (error) {
        retries++;

        this.logger.error(
          `Attempt ${retries}/${this.maxRetries} failed for pattern ${pattern}: ${error.message}`,
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
      this.logger.debug(
        `Publishing event to pattern: ${pattern} with data:`,
        data,
      );

      this.client.emit(pattern, data);

      this.logger.debug(`Successfully published event to pattern: ${pattern}`);
    } catch (error) {
      this.logger.error(
        `Failed to publish event to pattern ${pattern}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
