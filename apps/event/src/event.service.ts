import { Injectable, Logger } from '@nestjs/common';
import { Event } from '../entity/event.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
  ) {}

  async create(createEventDto: CreateEventDto): Promise<Event> {
    const { eventId, bookerId } = createEventDto;

    try {
      const event = this.eventRepository.create({});

      await this.eventRepository.save(event);
      return event;
    } catch (error) {
      this.logger.error(
        `Failed to create booking: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
