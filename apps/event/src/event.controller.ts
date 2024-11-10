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
} from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventService } from './event.service';

@Controller('event')
export class EventController {
  private readonly logger = new Logger(EventController.name);
  constructor(private readonly eventService: EventService) {}

  @Post()
  async create(@Body() createEventDto: CreateEventDto) {
    try {
      this.logger.debug(
        `Received create event request: ${JSON.stringify(createEventDto)}`,
      );

      const result = await this.eventService.create(createEventDto);

      this.logger.debug(
        `Event created successfully: ${JSON.stringify(result)}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to create event: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to create event');
    }
  }

  @Get()
  async list() {
    try {
      this.logger.debug('Listing all events');

      const events = await this.eventService.list();

      this.logger.debug(`Found ${events.length} events`);

      return events;
    } catch (error) {
      this.logger.error(`Failed to list events: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to list events');
    }
  }

  @Get(':id')
  async find(@Param('id') id: string) {
    try {
      this.logger.debug(`Finding event with ID: ${id}`);

      const event = await this.eventService.find(id);

      this.logger.debug(`Found event: ${JSON.stringify(event)}`);

      return event;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to find event: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to find event');
    }
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
  ) {
    try {
      this.logger.debug(
        `Updating event ${id} with data: ${JSON.stringify(updateEventDto)}`,
      );

      const event = await this.eventService.update(id, updateEventDto);

      this.logger.debug(`Updated event: ${JSON.stringify(event)}`);

      return event;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to update event: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to update event');
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      this.logger.debug(`Deleting event with ID: ${id}`);

      await this.eventService.remove(id);

      this.logger.debug(`Successfully deleted event ${id}`);

      return { message: 'event deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to delete event: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to delete event');
    }
  }
}
