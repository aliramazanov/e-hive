import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventEntity } from './entity/event.entity';

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  constructor(
    @InjectRepository(EventEntity)
    private readonly eventRepository: Repository<EventEntity>,
  ) {}

  async createEvent(eventData: CreateEventDto): Promise<EventEntity> {
    this.logger.debug(`Creating event with data: ${JSON.stringify(eventData)}`);
    try {
      const event = this.eventRepository.create({
        ...eventData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const savedEvent = await this.eventRepository.save(event);
      this.logger.debug(`Successfully created event with ID: ${savedEvent.id}`);
      return savedEvent;
    } catch (error) {
      this.logger.error(`Error creating event: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to create event');
    }
  }

  async findById(id: string): Promise<EventEntity> {
    this.logger.debug(`Finding event by ID: ${id}`);
    try {
      const event = await this.eventRepository.findOne({ where: { id } });

      if (!event) {
        this.logger.warn(`No event found with ID: ${id}`);
        throw new NotFoundException(`Event with ID ${id} not found`);
      }

      this.logger.debug(`Found event with ID: ${id}`);
      return event;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error finding event ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to find event');
    }
  }

  async findAll(): Promise<EventEntity[]> {
    this.logger.debug('Finding all events');
    try {
      const events = await this.eventRepository.find({
        order: {
          createdAt: 'DESC',
        },
      });
      this.logger.debug(`Found ${events.length} events`);
      return events;
    } catch (error) {
      this.logger.error(
        `Error finding all events: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to fetch events');
    }
  }

  async update(
    id: string,
    updateEventDto: UpdateEventDto,
  ): Promise<EventEntity> {
    this.logger.debug(
      `Updating event ${id} with data: ${JSON.stringify(updateEventDto)}`,
    );
    try {
      const event = await this.findById(id);

      const updatedEvent = this.eventRepository.merge(event, {
        ...updateEventDto,
        updatedAt: new Date(),
      });

      const savedEvent = await this.eventRepository.save(updatedEvent);
      this.logger.debug(`Successfully updated event ${id}`);
      return savedEvent;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error updating event ${id}: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to update event');
    }
  }

  async remove(id: string): Promise<void> {
    this.logger.debug(`Removing event with ID: ${id}`);
    try {
      const event = await this.findById(id);
      await this.eventRepository.remove(event);
      this.logger.debug(`Successfully removed event ${id}`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error removing event ${id}: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to remove event');
    }
  }
}
