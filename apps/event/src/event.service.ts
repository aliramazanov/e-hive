import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Event } from './entity/event.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
  ) {}

  async create(createEventDto: CreateEventDto): Promise<Event> {
    const { name, location, startDate, endDate, eventType } = createEventDto;

    try {
      const event = this.eventRepository.create({
        name,
        location,
        startDate,
        endDate,
        eventType,
      });

      await this.eventRepository.save(event);
      return event;
    } catch (error) {
      this.logger.error(
        `Failed to create event: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async list(): Promise<Event[]> {
    try {
      return await this.eventRepository.find({
        order: {
          timestamp: 'DESC',
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to list bookings: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async find(id: string): Promise<Event> {
    try {
      const event = await this.eventRepository.findOne({
        where: { id },
      });

      if (!event) {
        throw new NotFoundException(`Event with ID "${id}" not found`);
      }

      return event;
    } catch (error) {
      this.logger.error(`Failed to find event: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(id: string, updateEventDto: UpdateEventDto): Promise<Event> {
    try {
      const event = await this.find(id);

      Object.assign(event, updateEventDto);

      return await this.eventRepository.save(event);
    } catch (error) {
      this.logger.error(
        `Failed to update event: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const event = await this.find(id);

      await this.eventRepository.remove(event);
    } catch (error) {
      this.logger.error(
        `Failed to remove event: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
