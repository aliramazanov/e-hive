import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventService } from './event.service';

@Controller('event')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createEventDto: CreateEventDto) {
    return this.eventService.createEvent(createEventDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll() {
    return this.eventService.findAll();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return this.eventService.findById(id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
  ) {
    return this.eventService.update(id, updateEventDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.eventService.remove(id);
  }

  @MessagePattern('create_event')
  async createEvent(eventData: CreateEventDto) {
    return this.eventService.createEvent(eventData);
  }

  @MessagePattern('get_event')
  async getEvent(id: string) {
    return this.eventService.findById(id);
  }

  @MessagePattern('get_all_events')
  async getAllEvents() {
    return this.eventService.findAll();
  }

  @MessagePattern('update_event')
  async updateEvent(data: { id: string; updateEventDto: UpdateEventDto }) {
    return this.eventService.update(data.id, data.updateEventDto);
  }

  @MessagePattern('delete_event')
  async deleteEvent(id: string) {
    return this.eventService.remove(id);
  }
}
