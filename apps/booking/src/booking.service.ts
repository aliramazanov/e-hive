import { MessagePatterns } from '@app/common';
import { RabbitMQService } from '@app/rabbitmq';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
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
    try {
      const user = await this.rabbitMQService.send(MessagePatterns.user_get, {
        id: userId,
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      this.logger.debug(`User validated successfully: ${userId}`);
    } catch (error) {
      this.logger.error(
        `User validation failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async validateEvents(eventIds: string[]): Promise<void> {
    this.logger.debug(`Starting validation for events: ${eventIds.join(', ')}`);

    try {
      await Promise.all(
        eventIds.map(async (eventId) => {
          this.logger.debug(`Validating event with ID: ${eventId}`);
          const event = await this.rabbitMQService.send(
            MessagePatterns.event_get,
            eventId,
          );

          if (!event) {
            throw new NotFoundException(`Event with ID ${eventId} not found`);
          }

          this.logger.debug(`Event validated successfully: ${eventId}`);
          return event;
        }),
      );

      this.logger.debug('All events validated successfully');
    } catch (error) {
      this.logger.error('Event validation failed:', error);
      throw error;
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
          this.rabbitMQService.send(MessagePatterns.booking_create, {
            eventId,
            bookingId,
            userId,
          }),
        ),
      );
      this.logger.debug('Successfully notified all events about booking');
    } catch (error) {
      this.logger.error(
        `Failed to notify events about booking: ${error.message}`,
        error.stack,
      );
      // Consider whether to throw or just log the error
      throw new InternalServerErrorException(
        'Failed to notify events about booking',
      );
    }
  }

  async createBooking(userId: string, eventIds: string[]): Promise<Booking> {
    this.logger.debug(
      `Creating booking for user ${userId} with events: ${eventIds.join(', ')}`,
    );

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

      throw new InternalServerErrorException('Failed to create booking');
    }
  }

  async findByUserId(userId: string): Promise<Booking[]> {
    this.logger.debug(`Finding bookings for user: ${userId}`);
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
      this.logger.error(
        `Failed to fetch bookings: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to fetch bookings');
    }
  }

  async findById(id: string): Promise<Booking> {
    this.logger.debug(`Finding booking by ID: ${id}`);
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
      this.logger.error(
        `Failed to fetch booking: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to fetch booking');
    }
  }
}
