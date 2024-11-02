import { JwtAuthGuard } from '@app/common';
import { Injectable, Logger, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { Booking } from './entity/booking.entity';
import { BookingRepository } from './repository/booking.repository';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);
  constructor(private readonly bookingRepository: BookingRepository) {}

  async create(createBookingDto: CreateBookingDto): Promise<Booking> {
    try {
      const booking = new Booking({
        ...createBookingDto,
        timestamp: new Date(),
      });
      return await this.bookingRepository.create(booking);
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
      return await this.bookingRepository.find({});
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
      return await this.bookingRepository.findOne({ id });
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
      return await this.bookingRepository.findOneAndUpdate(
        { id },
        updateBookingDto,
      );
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
      await this.bookingRepository.findOneAndDelete({ id });
    } catch (error) {
      this.logger.error(
        `Failed to remove booking: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
