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
import { EntityManager, Repository } from 'typeorm';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { Booking } from './entity/booking.entity';
import { BookingStatus } from './enum/booking-status.enum';
import { ValidationService } from './validation/validation.service';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);
  private readonly max_retries = 3;
  private readonly retry_delay = 1000;

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,

    @Inject('RABBITMQ_CLIENT')
    private readonly rmqService: RabbitMQService,

    private readonly validationService: ValidationService,
  ) {}

  private async publishWithRetry(
    pattern: string,
    data: any,
    retries = this.max_retries,
  ): Promise<void> {
    for (let i = 0; i < retries; i++) {
      try {
        await this.rmqService.publish(pattern, data);
        return;
      } catch (error) {
        this.logger.warn(
          `Failed to publish message (attempt ${i + 1}/${retries}): ${error.message}`,
        );

        if (i === retries - 1) {
          throw new Error(
            `Failed to publish message after ${retries} attempts`,
          );
        }

        await new Promise((resolve) =>
          setTimeout(resolve, this.retry_delay * Math.pow(2, i)),
        );
      }
    }
  }

  private async findBookingWithLock(
    id: string,
    manager: EntityManager,
  ): Promise<Booking> {
    const startTime = Date.now();
    try {
      const booking = await manager
        .createQueryBuilder(Booking, 'booking')
        .setLock('pessimistic_write')
        .where('booking.id = :id', { id })
        .select([
          'booking.id',
          'booking.userId',
          'booking.status',
          'booking.eventIds',
          'booking.metadata',
          'booking.createdAt',
          'booking.updatedAt',
          'booking.cancelledAt',
          'booking.completedAt',
        ])
        .getOne();

      if (!booking) {
        throw new NotFoundException(`Booking with ID ${id} not found`);
      }

      const timeTaken = Date.now() - startTime;
      this.logger.debug(`Found booking ${id} in ${timeTaken}ms`);

      return booking;
    } catch (error) {
      const timeTaken = Date.now() - startTime;
      this.logger.error(
        `Failed to find booking ${id} after ${timeTaken}ms: ${error.message}`,
      );
      throw error;
    }
  }

  private async validateBookingData(
    createBookingDto: CreateBookingDto,
  ): Promise<void> {
    const startTime = Date.now();

    if (!createBookingDto.eventIds?.length) {
      throw new BadRequestException('At least one event must be selected');
    }

    try {
      await Promise.all([
        this.validateUser(createBookingDto.userId),
        this.validationService.validateEvents(createBookingDto.eventIds),
      ]);

      const timeTaken = Date.now() - startTime;
      this.logger.debug(`Validated booking data in ${timeTaken}ms`);
    } catch (error) {
      const timeTaken = Date.now() - startTime;
      this.logger.error(
        `Validation failed after ${timeTaken}ms: ${error.message}`,
      );
      throw new BadRequestException(`Validation failed: ${error.message}`);
    }
  }

  async createBooking(createBookingDto: CreateBookingDto): Promise<Booking> {
    const startTime = Date.now();
    this.logger.debug(
      `Creating booking for user ${createBookingDto.userId} with events ${createBookingDto.eventIds}`,
    );

    await this.validateBookingData(createBookingDto);

    try {
      return await this.bookingRepository.manager.transaction(
        async (transactionalEntityManager) => {
          const booking = transactionalEntityManager.create(Booking, {
            userId: createBookingDto.userId,
            eventIds: createBookingDto.eventIds,
            status: BookingStatus.pending,
            metadata: {
              notes: createBookingDto.notes,
              createdAt: new Date(),
            },
          });

          const savedBooking = await transactionalEntityManager.save(booking);

          setImmediate(async () => {
            try {
              await this.publishWithRetry(MessagePatterns.booking_create, {
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
          });

          const timeTaken = Date.now() - startTime;
          this.logger.debug(
            `Created booking ${savedBooking.id} in ${timeTaken}ms`,
          );

          return savedBooking;
        },
      );
    } catch (error) {
      const timeTaken = Date.now() - startTime;
      this.logger.error(
        `Failed to create booking after ${timeTaken}ms: ${error.message}`,
      );
      throw error;
    }
  }

  async updateBooking(
    id: string,
    userId: string,
    updateDto: UpdateBookingDto,
  ): Promise<Booking> {
    const startTime = Date.now();
    this.logger.debug(`Updating booking ${id} for user ${userId}`);

    try {
      return await this.bookingRepository.manager.transaction(
        async (transactionalEntityManager) => {
          const booking = await this.findBookingWithLock(
            id,
            transactionalEntityManager,
          );

          if (booking.userId !== userId) {
            throw new BadRequestException(
              `Not authorized to update booking ${id}. Booking belongs to user ${booking.userId}`,
            );
          }

          if (
            booking.status === BookingStatus.cancelled ||
            booking.status === BookingStatus.completed
          ) {
            throw new BadRequestException(
              `Cannot update booking ${id} with status ${booking.status}`,
            );
          }

          const previousStatus = booking.status;
          Object.assign(booking, updateDto);
          booking.updatedAt = new Date();

          if (updateDto.status === BookingStatus.cancelled) {
            if (!updateDto.cancellationReason?.trim()) {
              throw new BadRequestException('Cancellation reason is required');
            }
            booking.cancelledAt = new Date();
            booking.metadata = {
              ...booking.metadata,
              cancellationReason: updateDto.cancellationReason.trim(),
            };
          }

          if (updateDto.status === BookingStatus.completed) {
            booking.completedAt = new Date();
          }

          const savedBooking = await transactionalEntityManager.save(booking);

          setImmediate(async () => {
            try {
              await this.publishWithRetry(MessagePatterns.booking_update, {
                bookingId: savedBooking.id,
                previousStatus,
                newStatus: savedBooking.status,
              });
            } catch (error) {
              this.logger.error(
                `Failed to publish booking update event: ${error.message}`,
                error.stack,
              );
            }
          });

          const timeTaken = Date.now() - startTime;
          this.logger.debug(
            `Updated booking ${savedBooking.id} in ${timeTaken}ms`,
          );

          return savedBooking;
        },
      );
    } catch (error) {
      const timeTaken = Date.now() - startTime;
      this.logger.error(
        `Failed to update booking ${id} after ${timeTaken}ms: ${error.message}`,
      );
      throw error;
    }
  }

  async cancelBooking(
    id: string,
    userId: string,
    reason: string,
  ): Promise<Booking> {
    const startTime = Date.now();
    this.logger.debug(`Cancelling booking ${id} for user ${userId}`);

    if (!reason?.trim()) {
      throw new BadRequestException('Cancellation reason is required');
    }

    try {
      const result = await this.updateBooking(id, userId, {
        status: BookingStatus.cancelled,
        cancellationReason: reason.trim(),
      });

      const timeTaken = Date.now() - startTime;
      this.logger.debug(`Cancelled booking ${id} in ${timeTaken}ms`);

      return result;
    } catch (error) {
      const timeTaken = Date.now() - startTime;
      this.logger.error(
        `Failed to cancel booking ${id} after ${timeTaken}ms: ${error.message}`,
      );
      throw error;
    }
  }

  async completeBooking(id: string): Promise<Booking> {
    const startTime = Date.now();
    this.logger.debug(`Completing booking ${id}`);

    try {
      return await this.bookingRepository.manager.transaction(
        async (transactionalEntityManager) => {
          const booking = await this.findBookingWithLock(
            id,
            transactionalEntityManager,
          );

          if (booking.status !== BookingStatus.confirmed) {
            throw new BadRequestException(
              `Cannot complete booking ${id}. Current status: ${booking.status}. Required status: ${BookingStatus.confirmed}`,
            );
          }

          const result = await this.updateBooking(id, booking.userId, {
            status: BookingStatus.completed,
          });

          const timeTaken = Date.now() - startTime;
          this.logger.debug(`Completed booking ${id} in ${timeTaken}ms`);

          return result;
        },
      );
    } catch (error) {
      const timeTaken = Date.now() - startTime;
      this.logger.error(
        `Failed to complete booking ${id} after ${timeTaken}ms: ${error.message}`,
      );
      throw error;
    }
  }

  async findByUserId(userId: string): Promise<Booking[]> {
    const startTime = Date.now();
    this.logger.debug(`Finding bookings for user ${userId}`);

    try {
      const bookings = await this.bookingRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
        take: 50,
      });

      const timeTaken = Date.now() - startTime;
      this.logger.debug(
        `Found ${bookings.length} bookings for user ${userId} in ${timeTaken}ms`,
      );

      return bookings;
    } catch (error) {
      const timeTaken = Date.now() - startTime;
      this.logger.error(
        `Failed to find bookings for user ${userId} after ${timeTaken}ms: ${error.message}`,
      );
      throw error;
    }
  }

  private async validateUser(userId: string): Promise<void> {
    const startTime = Date.now();
    this.logger.debug(`Validating user ${userId}`);

    try {
      const user = await this.rmqService.send(MessagePatterns.user_get, {
        id: userId,
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      const timeTaken = Date.now() - startTime;
      this.logger.debug(`Validated user ${userId} in ${timeTaken}ms`);
    } catch (error) {
      const timeTaken = Date.now() - startTime;
      this.logger.error(
        `Failed to validate user ${userId} after ${timeTaken}ms: ${error.message}`,
      );
      throw new BadRequestException(
        `Failed to validate user ${userId}: ${error.message}`,
      );
    }
  }
}
