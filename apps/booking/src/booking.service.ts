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
import { Inject } from '@nestjs/common';
import { ValidationService } from './validation/validation.service';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @Inject('RABBITMQ_CLIENT')
    private readonly userService: RabbitMQService,
    private readonly validationService: ValidationService,
  ) {}

  private async validateUser(userId: string): Promise<void> {
    this.logger.debug(`Validating user with ID: ${userId}`);
    const user = await this.userService.send('user.get', { id: userId });

    if (!user) {
      this.logger.error(`User not found with ID: ${userId}`);
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    this.logger.debug(`User validated successfully: ${userId}`);
  }

  async createBooking(userId: string, eventIds: string[]): Promise<Booking> {
    if (!eventIds?.length) {
      throw new BadRequestException('At least one event ID must be provided');
    }

    try {
      await this.validateUser(userId);
      await this.validationService.validateEvents(eventIds);

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

      await this.validationService.notifyEventBookings(
        savedBooking.id,
        userId,
        eventIds,
      );

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
