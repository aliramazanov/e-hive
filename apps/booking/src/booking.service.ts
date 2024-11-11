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

  async createBooking(userId: string, eventIds: string[]): Promise<Booking> {
    if (!eventIds?.length) {
      throw new BadRequestException('At least one event ID must be provided');
    }

    try {
      this.logger.debug(`Validating user with ID: ${userId}`);
      const userResponse = await this.rabbitMQService.send('get_user', {
        id: userId,
      });

      if (!userResponse) {
        this.logger.error(`User not found with ID: ${userId}`);
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      this.logger.debug(`User validated successfully: ${userId}`);
    } catch (error) {
      this.logger.error(
        `User validation failed: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException({
        message: 'Failed to validate user',
        error: error.message,
        details: 'Error occurred while processing user validation',
      });
    }

    try {
      this.logger.debug(`Validating events: ${eventIds.join(', ')}`);

      const eventPromises = eventIds.map(async (eventId) => {
        const response = await this.rabbitMQService.send('get_event', {
          id: eventId,
        });

        if (!response) {
          this.logger.error(`Event not found with ID: ${eventId}`);
          throw new NotFoundException(`Event with ID ${eventId} not found`);
        }

        return response;
      });

      await Promise.all(eventPromises);
      this.logger.debug('All events validated successfully');
    } catch (error) {
      this.logger.error(
        `Event validation failed: ${error.message}`,
        error.stack,
      );

      throw new BadRequestException({
        message: 'Failed to validate events',
        error: error.message,
        details: 'Error occurred while processing event validation',
      });
    }

    try {
      this.logger.debug('Creating new booking');

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

      try {
        await Promise.all(
          eventIds.map(async (eventId) =>
            this.rabbitMQService.send('booking_created', {
              eventId,
              bookingId: savedBooking.id,
              userId,
            }),
          ),
        );
      } catch (notificationError) {
        this.logger.warn(
          `Failed to notify event service about booking: ${notificationError.message}`,
        );
      }

      return savedBooking;
    } catch (error) {
      this.logger.error(
        `Booking creation failed: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException({
        message: 'Failed to create booking',
        error: error.message,
        details: 'Error occurred while saving booking to database',
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
