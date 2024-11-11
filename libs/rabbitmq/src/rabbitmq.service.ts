import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class RabbitMQService {
  constructor(
    @Inject('RABBITMQ_CLIENT')
    private readonly client: ClientProxy,
  ) {}

  async send(pattern: string, data: any): Promise<any> {
    try {
      return await firstValueFrom(this.client.send(pattern, data));
    } catch (error) {
      throw error;
    }
  }
}
