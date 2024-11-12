import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from './entity/event.entity';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
  ) {}

  async createEvent(eventData: Partial<Event>): Promise<Event> {
    this.logger.debug(`Creating event with data: ${JSON.stringify(eventData)}`);
    try {
      const event = this.eventRepository.create(eventData);
      const savedEvent = await this.eventRepository.save(event);
      this.logger.debug(`Successfully created event with ID: ${savedEvent.id}`);
      return savedEvent;
    } catch (error) {
      this.logger.error(`Error creating event: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findById(id: string): Promise<Event> {
    this.logger.debug(`Finding event by ID: ${id}`);
    try {
      const event = await this.eventRepository.findOne({ where: { id } });
      if (event) {
        this.logger.debug(`Found event with ID: ${id}`);
      } else {
        this.logger.debug(`No event found with ID: ${id}`);
      }
      return event;
    } catch (error) {
      this.logger.error(
        `Error finding event ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findAll(): Promise<Event[]> {
    this.logger.debug('Finding all events');
    try {
      const events = await this.eventRepository.find();
      this.logger.debug(`Found ${events.length} events`);
      return events;
    } catch (error) {
      this.logger.error(
        `Error finding all events: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async update(id: string, updateEventDto: UpdateEventDto): Promise<Event> {
    this.logger.debug(
      `Updating event ${id} with data: ${JSON.stringify(updateEventDto)}`,
    );
    try {
      const event = await this.findById(id);
      if (!event) {
        this.logger.error(`Event with ID ${id} not found for update`);
        throw new Error(`Event with ID ${id} not found`);
      }
      const updatedEvent = this.eventRepository.merge(event, updateEventDto);
      const savedEvent = await this.eventRepository.save(updatedEvent);
      this.logger.debug(`Successfully updated event ${id}`);
      return savedEvent;
    } catch (error) {
      this.logger.error(
        `Error updating event ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    this.logger.debug(`Removing event with ID: ${id}`);
    try {
      const event = await this.findById(id);
      if (!event) {
        this.logger.error(`Event with ID ${id} not found for removal`);
        throw new Error(`Event with ID ${id} not found`);
      }
      await this.eventRepository.remove(event);
      this.logger.debug(`Successfully removed event ${id}`);
    } catch (error) {
      this.logger.error(
        `Error removing event ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
