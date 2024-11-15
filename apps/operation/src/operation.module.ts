import { Module } from '@nestjs/common';
import { OperationController } from './operation.controller';
import { OperationService } from './operation.service';
import { TicketGenerationModule } from './ticket-generation/ticket-generation.module';

@Module({
  imports: [TicketGenerationModule],
  controllers: [OperationController],
  providers: [OperationService],
})
export class OperationModule {}
