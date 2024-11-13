import { EventResponse, MessagePatterns } from '@app/common';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventEntity } from './entity/event.entity';
import { EventService } from './event.service';

@Controller('event')
export class EventController {
  private readonly logger = new Logger(EventController.name);

  constructor(private readonly eventService: EventService) {}

  private mapToEventResponse(eventEntity: EventEntity): EventResponse {
    const response = new EventResponse();
    response.id = eventEntity.id;
    response.title = eventEntity.title;
    response.description = eventEntity.description;
    response.date = eventEntity.date;
    response.location = eventEntity.location;
    response.capacity = eventEntity.capacity;
    response.createdAt = eventEntity.createdAt;
    response.updatedAt = eventEntity.updatedAt;
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
  async create(@Body() createEventDto: CreateEventDto): Promise<EventResponse> {
    this.logger.log(
      `Creating new event with data: ${JSON.stringify(createEventDto)}`,
    );
    try {
      const eventEntity = await this.eventService.createEvent(createEventDto);
      return this.mapToEventResponse(eventEntity);
    } catch (error) {
      this.handleError(error, 'Failed to create event');
    }
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(): Promise<EventResponse[]> {
    this.logger.log('Retrieving all events');
    try {
      const events = await this.eventService.findAll();
      return events.map((eventEntity) => this.mapToEventResponse(eventEntity));
    } catch (error) {
      this.handleError(error, 'Failed to retrieve events');
    }
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<EventResponse> {
    this.logger.log(`Retrieving event with ID: ${id}`);
    try {
      const eventEntity = await this.eventService.findById(id);
      return this.mapToEventResponse(eventEntity);
    } catch (error) {
      this.handleError(error, `Failed to retrieve event ${id}`);
    }
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
  ): Promise<EventResponse> {
    this.logger.log(
      `Updating event ${id} with data: ${JSON.stringify(updateEventDto)}`,
    );
    try {
      const eventEntity = await this.eventService.update(id, updateEventDto);
      return this.mapToEventResponse(eventEntity);
    } catch (error) {
      this.handleError(error, `Failed to update event ${id}`);
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    this.logger.log(`Deleting event with ID: ${id}`);
    try {
      await this.eventService.remove(id);
    } catch (error) {
      this.handleError(error, `Failed to delete event ${id}`);
    }
  }

  @MessagePattern(MessagePatterns.event_create)
  async createEventMessage(eventData: CreateEventDto): Promise<EventResponse> {
    this.logger.log(
      `Received create event message with data: ${JSON.stringify(eventData)}`,
    );
    try {
      const eventEntity = await this.eventService.createEvent(eventData);
      return this.mapToEventResponse(eventEntity);
    } catch (error) {
      this.handleError(error, 'Failed to create event via message');
    }
  }

  @MessagePattern(MessagePatterns.event_get)
  async getEventMessage(id: string): Promise<EventResponse> {
    this.logger.log(`Received get event message for ID: ${id}`);
    try {
      const eventEntity = await this.eventService.findById(id);
      return this.mapToEventResponse(eventEntity);
    } catch (error) {
      this.handleError(error, `Failed to retrieve event ${id} via message`);
    }
  }

  @MessagePattern(MessagePatterns.event_update)
  async updateEventMessage(data: {
    id: string;
    updateEventDto: UpdateEventDto;
  }): Promise<EventResponse> {
    this.logger.log(`Received update event message for ID ${data.id}`);
    try {
      const eventEntity = await this.eventService.update(
        data.id,
        data.updateEventDto,
      );
      return this.mapToEventResponse(eventEntity);
    } catch (error) {
      this.handleError(error, `Failed to update event ${data.id} via message`);
    }
  }

  @MessagePattern(MessagePatterns.event_delete)
  async deleteEventMessage(id: string): Promise<void> {
    this.logger.log(`Received delete event message for ID: ${id}`);
    try {
      await this.eventService.remove(id);
    } catch (error) {
      this.handleError(error, `Failed to delete event ${id} via message`);
    }
  }

  @MessagePattern(MessagePatterns.event_get_all)
  async getAllEventsMessage(): Promise<EventResponse[]> {
    this.logger.log('Received get all events message');
    try {
      const events = await this.eventService.findAll();
      return events.map((eventEntity) => this.mapToEventResponse(eventEntity));
    } catch (error) {
      this.handleError(error, 'Failed to retrieve events via message');
    }
  }
}
