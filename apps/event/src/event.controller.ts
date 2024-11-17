import { MessagePatterns } from '@app/common';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateEventDto } from './dto/create-event.dto';
import { PageDto } from './dto/pagination.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventService } from './event.service';

@Controller('event')
export class EventController {
  private readonly logger = new Logger(EventController.name);
  constructor(private readonly eventService: EventService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createEventDto: CreateEventDto) {
    this.logger.log(`Creating new event: ${JSON.stringify(createEventDto)}`);
    try {
      const result = await this.eventService.createEvent(
        createEventDto,
        createEventDto.organizerId,
      );
      this.logger.log(`Successfully created event with ID: ${result.id}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to create event: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() pageDto: PageDto) {
    this.logger.log('Retrieving events with filters:', pageDto);
    try {
      const result = await this.eventService.findAll(pageDto);
      this.logger.log(
        `Retrieved ${result.data.length} events out of ${result.total}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve events: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get('my-events/:organizerId')
  @HttpCode(HttpStatus.OK)
  async getMyEvents(@Param('organizerId') organizerId: string) {
    this.logger.log(`Retrieving events for organizer: ${organizerId}`);
    try {
      const events = await this.eventService.findByOrganizer(organizerId);
      this.logger.log(`Retrieved ${events.length} events for organizer`);
      return events;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve organizer events: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get('upcoming')
  @HttpCode(HttpStatus.OK)
  async getUpcomingEvents() {
    this.logger.log('Retrieving upcoming events');
    try {
      const events = await this.eventService.getUpcomingEvents();
      this.logger.log(`Retrieved ${events.length} upcoming events`);
      return events;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve upcoming events: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    this.logger.log(`Retrieving event with ID: ${id}`);
    try {
      const event = await this.eventService.findById(id);
      this.logger.log(`Retrieved event with ID: ${id}`);
      return event;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve event ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Put(':id/:organizerId')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Param('organizerId') organizerId: string,
    @Body() updateEventDto: UpdateEventDto,
  ) {
    this.logger.log(
      `Updating event ${id} by organizer ${organizerId} with data: ${JSON.stringify(updateEventDto)}`,
    );
    try {
      const result = await this.eventService.update(
        id,
        updateEventDto,
        organizerId,
      );
      this.logger.log(`Successfully updated event ${id}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to update event ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Delete(':id/:organizerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @Param('organizerId') organizerId: string,
  ) {
    this.logger.log(`Deleting event ${id} by organizer: ${organizerId}`);
    try {
      await this.eventService.remove(id, organizerId);
      this.logger.log(`Successfully deleted event ${id}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete event ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern(MessagePatterns.event_create)
  async createEventMessagePattern(
    @Payload() data: { createEventDto: CreateEventDto; organizerId: string },
  ) {
    this.logger.log(
      `Received event.create message with data: ${JSON.stringify(data)}`,
    );
    return this.eventService.createEvent(data.createEventDto, data.organizerId);
  }

  @MessagePattern(MessagePatterns.event_get_all)
  async getAllEventsMessagePattern(@Payload() pageDto: PageDto) {
    this.logger.log('Received event.getall message');
    return this.eventService.findAll(pageDto);
  }

  @MessagePattern(MessagePatterns.event_get)
  async getEventMessagePattern(@Payload() id: string) {
    this.logger.log(`Received event.get message for ID: ${id}`);
    return this.eventService.findById(id);
  }

  @MessagePattern(MessagePatterns.event_update)
  async updateEventMessagePattern(
    @Payload() data: { id: string; updateEventDto: UpdateEventDto },
  ) {
    this.logger.log(`Received event.update message for ID ${data.id}`);
    return this.eventService.update(
      data.id,
      data.updateEventDto,
      data.updateEventDto.organizerId,
    );
  }

  @MessagePattern(MessagePatterns.event_delete)
  async deleteEventMessagePattern(
    @Payload() data: { id: string; organizerId: string },
  ) {
    this.logger.log(`Received event.delete message for ID: ${data.id}`);
    return this.eventService.remove(data.id, data.organizerId);
  }

  @MessagePattern(MessagePatterns.event_check_availability)
  async checkEventAvailabilityMessagePattern(@Payload() id: string) {
    this.logger.log(`Received event.check_availability message for ID: ${id}`);
    return this.eventService.checkEventAvailability(id);
  }
}
