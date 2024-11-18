import { MessagePatterns } from '@app/common';
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
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { Booking } from './entity/booking.entity';
import { BookingStatus } from './enum/booking-status.enum';
import { ValidationService } from './validation/validation.service';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,

    @Inject('RABBITMQ_CLIENT')
    private readonly rmqService: RabbitMQService,

    private readonly validationService: ValidationService,
  ) {}

  async createBooking(createBookingDto: CreateBookingDto): Promise<Booking> {
    return await this.bookingRepository.manager.transaction(async (manager) => {
      await Promise.all([
        this.validateUser(createBookingDto.userId),
        this.validationService.validateEvents(createBookingDto.eventIds),
      ]);

      const booking = manager.create(Booking, {
        userId: createBookingDto.userId,
        eventIds: createBookingDto.eventIds,
        status: BookingStatus.pending,
        metadata: {
          notes: createBookingDto.notes,
          createdAt: new Date(),
        },
      });

      const savedBooking = await manager.save(booking);

      try {
        await this.rmqService.publish(MessagePatterns.booking_create, {
          bookingId: savedBooking.id,
          userId: savedBooking.userId,
          eventIds: savedBooking.eventIds,
          status: savedBooking.status,
          timestamp: new Date(),
        });
      } catch (error) {
        this.logger.error(
          `Failed to publish booking creation event: ${error.message}`,
          error.stack,
        );
      }

      return savedBooking;
    });
  }

  async updateBooking(
    id: string,
    userId: string,
    updateDto: UpdateBookingDto,
  ): Promise<Booking> {
    return await this.bookingRepository.manager.transaction(async (manager) => {
      const booking = await this.findBookingWithLock(id);

      if (booking.userId !== userId) {
        throw new BadRequestException('Not authorized to update this booking');
      }

      if (
        booking.status === BookingStatus.cancelled ||
        booking.status === BookingStatus.completed
      ) {
        throw new BadRequestException(
          'Cannot update a cancelled or completed booking',
        );
      }

      const previousStatus = booking.status;
      Object.assign(booking, updateDto);
      booking.updatedAt = new Date();

      if (updateDto.status === BookingStatus.cancelled) {
        booking.cancelledAt = new Date();
        booking.metadata = {
          ...booking.metadata,
          cancellationReason: updateDto.cancellationReason,
        };
      }

      if (updateDto.status === BookingStatus.completed) {
        booking.completedAt = new Date();
      }

      const savedBooking = await manager.save(booking);

      await this.rmqService.publish(MessagePatterns.booking_update, {
        bookingId: savedBooking.id,
        previousStatus,
        newStatus: savedBooking.status,
      });

      return savedBooking;
    });
  }

  async cancelBooking(
    id: string,
    userId: string,
    reason: string,
  ): Promise<Booking> {
    return this.updateBooking(id, userId, {
      status: BookingStatus.cancelled,
      cancellationReason: reason,
    });
  }

  async completeBooking(id: string): Promise<Booking> {
    const booking = await this.findBookingWithLock(id);

    if (booking.status !== BookingStatus.confirmed) {
      throw new BadRequestException('Only confirmed bookings can be completed');
    }

    return this.updateBooking(id, booking.userId, {
      status: BookingStatus.completed,
    });
  }

  async findByUserId(userId: string): Promise<Booking[]> {
    const bookings = await this.bookingRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    return bookings;
  }

  private async findBookingWithLock(id: string): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      lock: { mode: 'pessimistic_write' },
      select: ['id', 'userId', 'status'],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  private async validateUser(userId: string): Promise<void> {
    const user = await this.rmqService.send(MessagePatterns.user_get, {
      id: userId,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
  }
}
