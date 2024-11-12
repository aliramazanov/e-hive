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
    return this.eventService.createEvent(createEventDto);
  }

  @MessagePattern('create_event')
  async createEventMessagePattern(eventData: CreateEventDto) {
    return this.eventService.createEvent(eventData);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll() {
    return this.eventService.findAll();
  }

  @MessagePattern('get_all_events')
  async getAllEventsMessagePattern() {
    return this.eventService.findAll();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return this.eventService.findById(id);
  }

  @MessagePattern('event.get')
  async getEventMessagePattern(@Payload() id: string) {
    this.logger.debug(`Received event.get request for ID: ${id}`);
    try {
      const event = await this.eventService.findById(id);
      this.logger.debug(`Found event for ID ${id}:`, event);
      return event;
    } catch (error) {
      this.logger.error(`Error processing event.get for ID ${id}:`, error);
      throw error;
    }
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
  ) {
    return this.eventService.update(id, updateEventDto);
  }

  @MessagePattern('update_event')
  async updateEventMessagePattern(data: {
    id: string;
    updateEventDto: UpdateEventDto;
  }) {
    return this.eventService.update(data.id, data.updateEventDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.eventService.remove(id);
  }

  @MessagePattern('delete_event')
  async deleteEventMessagePattern(id: string) {
    return this.eventService.remove(id);
  }
}
