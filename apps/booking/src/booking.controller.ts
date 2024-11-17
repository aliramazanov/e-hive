import { MessagePatterns } from '@app/common';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
} from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Controller('booking')
export class BookingController {
  private readonly logger = new Logger(BookingController.name);
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createBookingDto: CreateBookingDto) {
    this.logger.log(`Creating booking for user: ${createBookingDto.userId}`);
    return this.bookingService.createBooking(
      createBookingDto.userId,
      createBookingDto.eventIds,
    );
  }

  @MessagePattern(MessagePatterns.booking_create)
  async createBookingMessagePattern(data: CreateBookingDto) {
    return this.bookingService.createBooking(data.userId, data.eventIds);
  }

  @Get('user/:userId')
  @HttpCode(HttpStatus.OK)
  async getUserBookingsHttp(@Param('userId') userId: string) {
    this.logger.log(`Fetching bookings for user: ${userId}`);
    return this.bookingService.findByUserId(userId);
  }

  @MessagePattern(MessagePatterns.booking_get_user)
  async getUserBookingsMessagePattern(userId: string) {
    return this.bookingService.findByUserId(userId);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getBookingHttp(@Param('id') id: string) {
    this.logger.log(`Fetching booking: ${id}`);
    return this.bookingService.findById(id);
  }

  @MessagePattern(MessagePatterns.booking_get)
  async getBookingMessagePattern(id: string) {
    return this.bookingService.findById(id);
  }
}
