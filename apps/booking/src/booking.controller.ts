import {
  Body,
  Controller,
  Delete,
  Get,
  InternalServerErrorException,
  Logger,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from '@app/common';

@Controller('booking')
export class BookingController {
  private readonly logger = new Logger(BookingController.name);
  constructor(private readonly bookingService: BookingService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() createBookingDto: CreateBookingDto) {
    try {
      this.logger.debug(
        `Received create booking request: ${JSON.stringify(createBookingDto)}`,
      );
      const result = await this.bookingService.create(createBookingDto);
      this.logger.debug(
        `Booking created successfully: ${JSON.stringify(result)}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to create booking: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to create booking');
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async list() {
    this.logger.log(`Listing all the booking entries`);
    return this.bookingService.list();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async find(@Param('id') id: string) {
    this.logger.log(`Finding booking with ID: ${id}`);
    return this.bookingService.find(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateBookingDto: UpdateBookingDto,
  ) {
    this.logger.log(`Updating booking with ID: ${id}`);
    return this.bookingService.update(id, updateBookingDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    this.logger.log(`Deleting booking with ID: ${id}`);
    return this.bookingService.remove(id);
  }
}
