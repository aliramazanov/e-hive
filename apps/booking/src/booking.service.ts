import { RabbitMQService } from '@app/rabbitmq';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from './entity/booking.entity';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  private async validateUser(userId: string): Promise<void> {
    this.logger.debug(`Validating user with ID: ${userId}`);
    const user = await this.rabbitMQService.send('user.get', { id: userId });

    if (!user) {
      this.logger.error(`User not found with ID: ${userId}`);
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    this.logger.debug(`User validated successfully: ${userId}`);
  }

  private async validateEvents(eventIds: string[]): Promise<void> {
    this.logger.debug(`Starting validation for events: ${eventIds.join(', ')}`);

    try {
      const validationPromises = eventIds.map(async (eventId) => {
        this.logger.debug(`Validating event with ID: ${eventId}`);
        const event = await this.rabbitMQService.send('event.get', eventId);

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

      throw new BadRequestException({
        message: 'Failed to validate events',
        error: error.message,
        details: 'Error occurred while validating events',
      });
    }
  }

  private async notifyEventBookings(
    bookingId: string,
    userId: string,
    eventIds: string[],
  ): Promise<void> {
    try {
      await Promise.all(
        eventIds.map((eventId) =>
          this.rabbitMQService.send('booking_created', {
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

  async createBooking(userId: string, eventIds: string[]): Promise<Booking> {
    if (!eventIds?.length) {
      throw new BadRequestException('At least one event ID must be provided');
    }

    try {
      await this.validateUser(userId);
      await this.validateEvents(eventIds);

      const booking = this.bookingRepository.create({
        userId,
        eventIds,
        status: 'confirmed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const savedBooking = await this.bookingRepository.save(booking);
      this.logger.debug(
        `Booking created successfully with ID: ${savedBooking.id}`,
      );

      await this.notifyEventBookings(savedBooking.id, userId, eventIds);

      return savedBooking;
    } catch (error) {
      this.logger.error(
        `Booking creation failed: ${error.message}`,
        error.stack,
      );

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new BadRequestException({
        message: 'Failed to create booking',
        error: error.message,
        details: 'Error occurred while processing booking creation',
      });
    }
  }

  async findByUserId(userId: string): Promise<Booking[]> {
    try {
      const bookings = await this.bookingRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
      });

      if (!bookings.length) {
        throw new NotFoundException(`No bookings found for user ${userId}`);
      }

      return bookings;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to fetch bookings: ${error.message || 'Unknown error'}`,
      );
    }
  }

  async findById(id: string): Promise<Booking> {
    try {
      const booking = await this.bookingRepository.findOne({
        where: { id },
      });

      if (!booking) {
        throw new NotFoundException(`Booking with ID ${id} not found`);
      }

      return booking;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to fetch booking: ${error.message || 'Unknown error'}`,
      );
    }
  }
}
