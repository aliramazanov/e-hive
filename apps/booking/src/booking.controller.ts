import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';

@Controller('booking')
export class BookingController {
  private readonly logger = new Logger(BookingController.name);
  constructor(private readonly bookingService: BookingService) {}

  @Post('/new')
  async create(@Body() createBookingDto: CreateBookingDto) {
    this.logger.log(`Data: ${JSON.stringify(createBookingDto)}`);
    return this.bookingService.create(createBookingDto);
  }

  @Get(':id')
  async find(@Param('id') id: string) {
    this.logger.log(`Finding booking with ID: ${id}`);
    return this.bookingService.find(id);
  }

  @Get('/all')
  async list() {
    this.logger.log(`Listing all the booking entries`);
    return this.bookingService.list();
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateBookingDto: UpdateBookingDto,
  ) {
    this.logger.log(`Updating booking with ID: ${id}`);
    return this.bookingService.update(id, updateBookingDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    this.logger.log(`Deleting booking with ID: ${id}`);
    return this.bookingService.remove(id);
  }
}
