import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { RabbitMQService } from '@app/rabbitmq';
import { Inject } from '@nestjs/common';

@Injectable()
export class ValidationService {
  private readonly logger = new Logger(ValidationService.name);

  constructor(
    @Inject('RABBITMQ_CLIENT')
    private readonly eventClient: RabbitMQService,
  ) {}

  async validateEvents(eventIds: string[]): Promise<void> {
    this.logger.debug(`Starting validation for events: ${eventIds.join(', ')}`);

    try {
      const validationPromises = eventIds.map(async (eventId) => {
        this.logger.debug(`Validating event with ID: ${eventId}`);
        const event = await this.eventClient.send('event.get', eventId);

        if (!event) {
          this.logger.error(`Event not found with ID: ${eventId}`);
          throw new NotFoundException(`Event with ID ${eventId} not found`);
        }

        this.logger.debug(`Event validated successfully: ${eventId}`, event);
        return event;
      });

      await Promise.all(validationPromises);
      this.logger.debug('All events validated successfully');
    } catch (error) {
      this.logger.error('Event validation failed:', {
        error: error.message,
        stack: error.stack,
      });

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException('Failed to validate events');
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
          this.eventClient.publish('booking_created', {
            eventId,
            bookingId,
            userId,
          }),
        ),
      );
      this.logger.debug('Successfully notified all events about booking');
    } catch (error) {
      this.logger.warn(
        `Failed to notify events about booking: ${error.message}`,
      );
    }
  }
}
