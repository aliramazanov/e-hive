import { JwtAuthGuard } from '@app/common';
import {
  Body,
  Controller,
  Delete,
  Get,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';

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

  // @UseGuards(JwtAuthGuard)
  @Get()
  async list() {
    try {
      this.logger.debug('Listing all bookings');

      const bookings = await this.bookingService.list();
      this.logger.debug(`Found ${bookings.length} bookings`);

      return bookings;
    } catch (error) {
      this.logger.error(
        `Failed to list bookings: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to list bookings');
    }
  }

  // @UseGuards(JwtAuthGuard)
  @Get(':id')
  async find(@Param('id') id: string) {
    try {
      this.logger.debug(`Finding booking with ID: ${id}`);

      const booking = await this.bookingService.find(id);
      this.logger.debug(`Found booking: ${JSON.stringify(booking)}`);

      return booking;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Failed to find booking: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to find booking');
    }
  }

  // @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateBookingDto: UpdateBookingDto,
  ) {
    try {
      this.logger.debug(
        `Updating booking ${id} with data: ${JSON.stringify(updateBookingDto)}`,
      );

      const booking = await this.bookingService.update(id, updateBookingDto);
      this.logger.debug(`Updated booking: ${JSON.stringify(booking)}`);

      return booking;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Failed to update booking: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to update booking');
    }
  }

  // @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      this.logger.debug(`Deleting booking with ID: ${id}`);

      await this.bookingService.remove(id);
      this.logger.debug(`Successfully deleted booking ${id}`);

      return { message: 'Booking deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Failed to delete booking: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to delete booking');
    }
  }
}
