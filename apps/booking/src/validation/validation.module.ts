import { Module } from '@nestjs/common';
import { RabbitMQModule } from '@app/rabbitmq';
import { ValidationService } from './validation.service';

@Module({
  imports: [RabbitMQModule.register('event_queue')],
  providers: [ValidationService],
  exports: [ValidationService],
})
export class ValidationModule {}
