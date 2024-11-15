import { RabbitQueues } from '@app/common';
import { RabbitMQModule } from '@app/rabbitmq';
import { Module } from '@nestjs/common';
import { TicketGenerationService } from './ticket-generation.service';

@Module({
  imports: [RabbitMQModule.register(RabbitQueues.microservices_event_queue)],
  providers: [TicketGenerationService],
  exports: [TicketGenerationService],
})
export class TicketGenerationModule {}
