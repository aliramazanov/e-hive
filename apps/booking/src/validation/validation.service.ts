import { MessagePatterns } from '@app/common';
import { RabbitMQService } from '@app/rabbitmq';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class ValidationService {
  private readonly logger = new Logger(ValidationService.name);

  constructor(
    @Inject('RABBITMQ_CLIENT')
    private readonly rmqService: RabbitMQService,
  ) {}

  async validateEvents(eventIds: string[]): Promise<void> {
    this.logger.debug(`Starting validation for events: ${eventIds.join(', ')}`);

    try {
      const validationPromises = eventIds.map(async (eventId) => {
        this.logger.debug(`Validating event with ID: ${eventId}`);
        const event = await this.rmqService.send(
          MessagePatterns.event_get,
          eventId,
        );

        if (!event) {
          throw new NotFoundException(`Event not found`);
        }

        const available = await this.rmqService.send(
          MessagePatterns.event_check_availability,
          eventId,
        );

        if (!available) {
          throw new BadRequestException(`Event ${eventId} is at full capacity`);
        }

        return event;
      });

      await Promise.all(validationPromises);
    } catch (error) {
      this.logger.error('Event validation failed:', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  async notifyEventBookings(
    bookingId: string,
    userId: string,
    eventIds: string[],
  ): Promise<void> {
    try {
      await Promise.all(
        eventIds.map((eventId) =>
          this.rmqService.publish(MessagePatterns.booking_create, {
            eventId,
            bookingId,
            userId,
            timestamp: new Date(),
          }),
        ),
      );
      this.logger.debug('Successfully notified all events about booking');
    } catch (error) {
      this.logger.warn(
        `Failed to notify events about booking: ${error.message}`,
        error.stack,
      );
    }
  }
}
