import { MessagePatterns, RabbitQueues } from '@app/common';
import { RabbitMQService } from '@app/rabbitmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';

interface EventData {
  id: string;
  title: string;
  description: string;
  date: Date;
  location: string;
  capacity: number;
  isActive: boolean;
  createdAt: Date;
}

@Injectable()
export class TicketGenerationService {
  private readonly logger = new Logger(TicketGenerationService.name);

  constructor(
    @Inject('RABBITMQ_CLIENT')
    private readonly eventClient: RabbitMQService,
  ) {}

  async generateTicket(eventId: string): Promise<Buffer> {
    try {
      const event = await this.eventClient.send(
        MessagePatterns.event_get,
        eventId,
      );

      console.log(event);

      if (!event) {
        this.logger.error(`Event not found with ID: ${eventId}`);
        throw new Error(`Event not found`);
      }

      return await this.createPDF(event);
    } catch (error) {
      this.logger.error(
        `Failed to generate ticket for event ${eventId}:`,
        error,
      );
      throw error;
    }
  }

  private async createPDF(event: EventData): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).stroke();

      doc
        .fontSize(24)
        .font('Helvetica-Bold')
        .text(event.title, 50, 150, { align: 'center' });

      doc
        .fontSize(14)
        .font('Helvetica')
        .text(event.description, 50, 200, {
          align: 'center',
          width: doc.page.width - 100,
        });

      const formattedDate = new Date(event.date).toLocaleString('en-US', {
        dateStyle: 'full',
        timeStyle: 'short',
      });

      const boxY = 300;
      doc.rect(50, boxY, doc.page.width - 100, 150).stroke();

      doc.font('Helvetica-Bold').text('Event Details:', 70, boxY + 20);

      doc
        .font('Helvetica')
        .text(`Date: ${formattedDate}`, 70, boxY + 50)
        .text(`Location: ${event.location}`, 70, boxY + 80)
        .text(`Capacity: ${event.capacity} attendees`, 70, boxY + 110);

      doc
        .fontSize(8)
        .text(event.id, doc.page.width - 160, doc.page.height - 50, {
          align: 'right',
        });

      doc.end();
    });
  }
}
