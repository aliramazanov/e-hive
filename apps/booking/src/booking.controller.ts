import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Controller('booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createBookingDto: CreateBookingDto) {
    return this.bookingService.createBooking(
      createBookingDto.userId,
      createBookingDto.eventIds,
    );
  }

  @MessagePattern('create_booking')
  async createBookingMessagePattern(data: CreateBookingDto) {
    return this.bookingService.createBooking(data.userId, data.eventIds);
  }

  @Get('user/:userId')
  @HttpCode(HttpStatus.OK)
  async getUserBookingsHttp(@Param('userId') userId: string) {
    return this.bookingService.findByUserId(userId);
  }

  @MessagePattern('get_user_bookings')
  async getUserBookingsMessagePattern(userId: string) {
    return this.bookingService.findByUserId(userId);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getBookingHttp(@Param('id') id: string) {
    return this.bookingService.findById(id);
  }

  @MessagePattern('get_booking')
  async getBookingMessagePattern(id: string) {
    return this.bookingService.findById(id);
  }
}
