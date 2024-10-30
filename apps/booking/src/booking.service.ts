import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { Booking } from './entity/booking.entity';
import { BookingRepository } from './repository/booking.repository';

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: BookingRepository,
  ) {}

  async create(createBookingDto: CreateBookingDto) {
    const id = crypto.randomUUID();
    const timestamp = new Date();

    const booking = {
      id,
      ...createBookingDto,
      timestamp,
    };

    this.bookingRepository.create(booking);
  }

  async find(id: string) {
    return this.bookingRepository.findOne({ id });
  }

  async list() {
    return this.bookingRepository.find({});
  }

  async update(id: string, updateBookingDto: UpdateBookingDto) {
    return this.bookingRepository.findOneAndUpdate({ id }, updateBookingDto);
  }

  async remove(id: string) {
    return this.bookingRepository.findOneAndDelete({ id });
  }
}