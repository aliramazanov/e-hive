import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';

@Injectable()
export class RabbitMQService {
  private readonly logger = new Logger(RabbitMQService.name);

  constructor(
    @Inject('RABBITMQ_CLIENT')
    private readonly client: ClientProxy,
  ) {}

  async send(pattern: string, data: any): Promise<any> {
    try {
      this.logger.debug(
        `Sending message to pattern: ${pattern} with data:`,
        data,
      );

      const response = await firstValueFrom(
        this.client.send(pattern, data).pipe(timeout(5000)),
      );

      this.logger.debug(`Received response from pattern ${pattern}:`, response);
      return response;
    } catch (error) {
      this.logger.error(
        `Failed to send message to pattern ${pattern}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
