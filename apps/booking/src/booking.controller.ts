import { MessagePatterns } from '@app/common';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';

@Controller('booking')
export class BookingController {
  private readonly logger = new Logger(BookingController.name);

  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createBookingDto: CreateBookingDto) {
    this.logger.log(`Creating booking for user: ${createBookingDto.userId}`);
    return this.bookingService.createBooking(createBookingDto);
  }

  @Put(':id/:userId')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() updateBookingDto: UpdateBookingDto,
  ) {
    return this.bookingService.updateBooking(id, userId, updateBookingDto);
  }

  @Post(':id/:userId/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body('reason') reason: string,
  ) {
    return this.bookingService.cancelBooking(id, userId, reason);
  }

  @Get('user/:userId')
  @HttpCode(HttpStatus.OK)
  async getUserBookings(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.bookingService.findByUserId(userId);
  }

  @MessagePattern(MessagePatterns.booking_create)
  async createBookingMessage(@Payload() createBookingDto: CreateBookingDto) {
    return this.bookingService.createBooking(createBookingDto);
  }

  @MessagePattern(MessagePatterns.booking_update)
  async updateBookingMessage(
    @Payload()
    data: {
      id: string;
      userId: string;
      updateDto: UpdateBookingDto;
    },
  ) {
    return this.bookingService.updateBooking(
      data.id,
      data.userId,
      data.updateDto,
    );
  }
}
