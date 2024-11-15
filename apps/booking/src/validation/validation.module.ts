import { RabbitQueues } from '@app/common';
import { RabbitMQModule } from '@app/rabbitmq';
import { Module } from '@nestjs/common';
import { ValidationService } from './validation.service';

@Module({
  imports: [RabbitMQModule.register(RabbitQueues.microservices_event_queue)],
  providers: [ValidationService],
  exports: [ValidationService],
})
export class ValidationModule {}
