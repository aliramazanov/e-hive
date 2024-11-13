import { BookingResponse, MessagePatterns } from '@app/common';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { Booking } from './entity/booking.entity';

@Controller('booking')
export class BookingController {
  private readonly logger = new Logger(BookingController.name);

  constructor(private readonly bookingService: BookingService) {}

  private mapToBookingResponse(booking: Booking): BookingResponse {
    const response = new BookingResponse();
    response.id = booking.id;
    response.userId = booking.userId;
    response.eventIds = booking.eventIds;
    response.status = booking.status;
    response.createdAt = booking.createdAt;
    response.updatedAt = booking.updatedAt;
    return response;
  }

  private handleError(error: any, message: string): never {
    this.logger.error(`${message}: ${error.message}`, error.stack);

    if (error instanceof NotFoundException) {
      throw error;
    }
    if (error instanceof BadRequestException) {
      throw error;
    }
    throw new InternalServerErrorException(message);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createBookingDto: CreateBookingDto,
  ): Promise<BookingResponse> {
    this.logger.log(`Creating booking for user: ${createBookingDto.userId}`);
    try {
      const booking = await this.bookingService.createBooking(
        createBookingDto.userId,
        createBookingDto.eventIds,
      );
      return this.mapToBookingResponse(booking);
    } catch (error) {
      this.handleError(error, 'Failed to create booking');
    }
  }

  @MessagePattern(MessagePatterns.booking_create)
  async createBookingMessage(data: CreateBookingDto): Promise<BookingResponse> {
    this.logger.log(`Received create booking message for user: ${data.userId}`);
    try {
      const booking = await this.bookingService.createBooking(
        data.userId,
        data.eventIds,
      );
      return this.mapToBookingResponse(booking);
    } catch (error) {
      this.handleError(error, 'Failed to create booking via message');
    }
  }

  @Get('user/:userId')
  @HttpCode(HttpStatus.OK)
  async getUserBookings(
    @Param('userId') userId: string,
  ): Promise<BookingResponse[]> {
    this.logger.log(`Fetching bookings for user: ${userId}`);
    try {
      const bookings = await this.bookingService.findByUserId(userId);
      return bookings.map((booking) => this.mapToBookingResponse(booking));
    } catch (error) {
      this.handleError(error, `Failed to fetch bookings for user ${userId}`);
    }
  }

  @MessagePattern(MessagePatterns.booking_get_user)
  async getUserBookingsMessage(userId: string): Promise<BookingResponse[]> {
    this.logger.log(`Received get user bookings message for user: ${userId}`);
    try {
      const bookings = await this.bookingService.findByUserId(userId);
      return bookings.map((booking) => this.mapToBookingResponse(booking));
    } catch (error) {
      this.handleError(
        error,
        `Failed to fetch bookings for user ${userId} via message`,
      );
    }
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getBooking(@Param('id') id: string): Promise<BookingResponse> {
    this.logger.log(`Fetching booking: ${id}`);
    try {
      const booking = await this.bookingService.findById(id);
      return this.mapToBookingResponse(booking);
    } catch (error) {
      this.handleError(error, `Failed to fetch booking ${id}`);
    }
  }

  @MessagePattern(MessagePatterns.booking_get)
  async getBookingMessage(id: string): Promise<BookingResponse> {
    this.logger.log(`Received get booking message for id: ${id}`);
    try {
      const booking = await this.bookingService.findById(id);
      return this.mapToBookingResponse(booking);
    } catch (error) {
      this.handleError(error, `Failed to fetch booking ${id} via message`);
    }
  }
}
