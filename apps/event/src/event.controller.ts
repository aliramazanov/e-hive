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
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventService } from './event.service';

@Controller('event')
export class EventController {
  private readonly logger = new Logger(EventController.name);

  constructor(private readonly eventService: EventService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createEventDto: CreateEventDto) {
    this.logger.log(`Creating new event : ${JSON.stringify(createEventDto)}`);
    try {
      const result = await this.eventService.createEvent(createEventDto);
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

  @MessagePattern(MessagePatterns.event_create)
  async createEventMessagePattern(eventData: CreateEventDto) {
    this.logger.log(
      `Received event.create message with data: ${JSON.stringify(eventData)}`,
    );
    try {
      const result = await this.eventService.createEvent(eventData);
      this.logger.log(
        `Successfully created event via message pattern. Event ID: ${result.id}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to create event via message pattern: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll() {
    this.logger.log('Retrieving all events');
    try {
      const events = await this.eventService.findAll();
      this.logger.log(`Retrieved ${events.length} events`);
      return events;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve events: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern(MessagePatterns.event_get_all)
  async getAllEventsMessagePattern() {
    this.logger.log('Received event.getall message');
    try {
      const events = await this.eventService.findAll();
      this.logger.log(`Retrieved ${events.length} events via message pattern`);
      return events;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve events via message pattern: ${error.message}`,
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

  @MessagePattern(MessagePatterns.event_get)
  async getEventMessagePattern(@Payload() id: string) {
    this.logger.log(`Received event.get message for ID: ${id}`);
    try {
      const event = await this.eventService.findById(id);
      this.logger.log(`Retrieved event with ID ${id} via message pattern`);
      return event;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve event ${id} via message pattern: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
  ) {
    this.logger.log(
      `Updating event ${id} with data: ${JSON.stringify(updateEventDto)}`,
    );
    try {
      const result = await this.eventService.update(id, updateEventDto);
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

  @MessagePattern(MessagePatterns.event_update)
  async updateEventMessagePattern(data: {
    id: string;
    updateEventDto: UpdateEventDto;
  }) {
    this.logger.log(
      `Received event.update message for ID ${data.id} with data: ${JSON.stringify(data.updateEventDto)}`,
    );
    try {
      const result = await this.eventService.update(
        data.id,
        data.updateEventDto,
      );
      this.logger.log(
        `Successfully updated event ${data.id} via message pattern`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to update event ${data.id} via message pattern: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    this.logger.log(`Deleting event with ID: ${id}`);
    try {
      await this.eventService.remove(id);
      this.logger.log(`Successfully deleted event ${id}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete event ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @MessagePattern(MessagePatterns.event_delete)
  async deleteEventMessagePattern(id: string) {
    this.logger.log(`Received event.delete message for ID: ${id}`);
    try {
      await this.eventService.remove(id);
      this.logger.log(`Successfully deleted event ${id} via message pattern`);
    } catch (error) {
      this.logger.error(
        `Failed to delete event ${id} via message pattern: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
