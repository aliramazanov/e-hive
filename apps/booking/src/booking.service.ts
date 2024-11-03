import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { Booking } from './entity/booking.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
  ) {}

  async create(createBookingDto: CreateBookingDto): Promise<Booking> {
    const { eventId, bookerId } = createBookingDto;

    try {
      const booking = this.bookingRepository.create({
        eventId,
        bookerId,
      });

      await this.bookingRepository.save(booking);
      return booking;
    } catch (error) {
      this.logger.error(
        `Failed to create booking: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async list(): Promise<Booking[]> {
    try {
      return await this.bookingRepository.find({
        order: {
          timestamp: 'DESC',
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to list bookings: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async find(id: string): Promise<Booking> {
    try {
      const booking = await this.bookingRepository.findOne({
        where: { id },
      });

      if (!booking) {
        throw new NotFoundException(`Booking with ID "${id}" not found`);
      }

      return booking;
    } catch (error) {
      this.logger.error(
        `Failed to find booking: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async update(
    id: string,
    updateBookingDto: UpdateBookingDto,
  ): Promise<Booking> {
    try {
      const booking = await this.find(id);

      Object.assign(booking, updateBookingDto);

      return await this.bookingRepository.save(booking);
    } catch (error) {
      this.logger.error(
        `Failed to update booking: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const booking = await this.find(id);

      await this.bookingRepository.remove(booking);
    } catch (error) {
      this.logger.error(
        `Failed to remove booking: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
