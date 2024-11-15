import { Injectable, Logger } from '@nestjs/common';
import { TicketGenerationService } from './ticket-generation/ticket-generation.service';

@Injectable()
export class OperationService {
  private readonly logger = new Logger(OperationService.name);

  constructor(
    private readonly ticketGenerationService: TicketGenerationService,
  ) {}

  async generateTicket(eventId: string): Promise<Buffer> {
    try {
      return await this.ticketGenerationService.generateTicket(eventId);
    } catch (error) {
      this.logger.error(
        `Failed to generate ticket for event ${eventId}:`,
        error,
      );
      throw error;
    }
  }
}
