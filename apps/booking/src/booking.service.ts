import { RabbitMQService } from '@app/rabbitmq';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from './entity/booking.entity';
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
      throw new NotFoundException(`User not found`);
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

      this.logger.debug(`Booking created with ID: ${savedBooking.id}`);

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

      throw new BadRequestException('Failed to create booking');
    }
  }

  async findByUserId(userId: string): Promise<Booking[]> {
    try {
      const bookings = await this.bookingRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
      });

      if (!bookings.length) {
        this.logger.error(`No bookings found for user: ${userId}`);
        throw new NotFoundException('No bookings found for user');
      }

      return bookings;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to fetch bookings for user: ${userId}: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to fetch bookings');
    }
  }

  async findById(id: string): Promise<Booking> {
    try {
      const booking = await this.bookingRepository.findOne({
        where: { id },
      });

      if (!booking) {
        this.logger.error(`Booking with ID ${id} not found`);
        throw new NotFoundException(`Booking not found`);
      }

      return booking;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to fetch booking: ${id}: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to fetch booking');
    }
  }
}
