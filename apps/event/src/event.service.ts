import { MessagePatterns } from '@app/common';
import { RabbitMQService } from '@app/rabbitmq';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { CreateEventDto } from './dto/create-event.dto';
import { PageDto } from './dto/pagination.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Event } from './entity/event.entity';

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    private readonly rmqService: RabbitMQService,
  ) {}

  async createEvent(
    createEventDto: CreateEventDto,
    organizerId: string,
  ): Promise<Event> {
    this.logger.debug(
      `Creating event with data: ${JSON.stringify(createEventDto)} for organizer: ${organizerId}`,
    );

    try {
      const event = this.eventRepository.create({
        ...createEventDto,
        organizerId,
        metadata: {},
        tags: createEventDto.tags || [],
        isActive: true,
      });

      const savedEvent = await this.eventRepository.save(event);

      await this.rmqService.publish(MessagePatterns.event_create, {
        id: savedEvent.id,
        organizerId: savedEvent.organizerId,
        capacity: savedEvent.capacity,
        date: savedEvent.date,
        isActive: savedEvent.isActive,
      });

      this.logger.debug(`Successfully created event ${savedEvent.id}`);
      return savedEvent;
    } catch (error) {
      this.logger.error(`Error creating event: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to create event');
    }
  }

  async findByOrganizer(organizerId: string): Promise<Event[]> {
    try {
      return await this.eventRepository.find({
        where: {
          organizerId,
          isActive: true,
        },
        order: {
          date: 'DESC',
        },
      });
    } catch (error) {
      this.logger.error(
        `Error finding events for organizer: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to fetch organizer events');
    }
  }

  async findById(id: string): Promise<Event> {
    this.logger.debug(`Finding event by ID: ${id}`);
    try {
      const event = await this.eventRepository.findOne({
        where: { id },
      });

      if (!event) {
        this.logger.debug(`No event found`);
        throw new NotFoundException(`Event not found`);
      }

      return event;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error finding event ${id}: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to fetch event');
    }
  }

  async findAll(pageDto: PageDto): Promise<{ data: Event[]; total: number }> {
    try {
      const queryBuilder = this.eventRepository.createQueryBuilder('event');

      if (pageDto.organizerId) {
        queryBuilder.andWhere('event.organizerId = :organizerId', {
          organizerId: pageDto.organizerId,
        });
      }

      if (pageDto.tags?.length) {
        queryBuilder.andWhere('event.tags && :tags', { tags: pageDto.tags });
      }

      if (pageDto.dateFrom) {
        queryBuilder.andWhere('event.date >= :dateFrom', {
          dateFrom: pageDto.dateFrom,
        });
      }

      if (pageDto.dateTo) {
        queryBuilder.andWhere('event.date <= :dateTo', {
          dateTo: pageDto.dateTo,
        });
      }

      queryBuilder.andWhere('event.isActive = :isActive', { isActive: true });

      const sortField = ['title', 'date', 'capacity', 'createdAt'].includes(
        pageDto.sortBy,
      )
        ? pageDto.sortBy
        : 'date';

      queryBuilder
        .orderBy(`event.${sortField}`, pageDto.sortOrder)
        .skip(pageDto.offset)
        .take(pageDto.limit);

      const [events, total] = await queryBuilder.getManyAndCount();

      this.logger.debug(`Found ${events.length} events out of ${total} total`);
      return { data: events, total };
    } catch (error) {
      this.logger.error(`Error finding events: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to fetch events');
    }
  }

  async update(
    id: string,
    updateEventDto: UpdateEventDto,
    organizerId: string,
  ): Promise<Event> {
    return await this.eventRepository.manager.transaction(async (manager) => {
      const event = await manager.findOne(Event, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!event) {
        throw new NotFoundException(`Event not found`);
      }

      if (event.organizerId !== organizerId) {
        throw new BadRequestException(
          'You do not have permission to update this event',
        );
      }

      if (
        updateEventDto.capacity !== undefined &&
        updateEventDto.capacity < 0
      ) {
        throw new BadRequestException('Capacity cannot be negative');
      }

      const updatedEvent = manager.merge(Event, event, updateEventDto);
      const savedEvent = await manager.save(Event, updatedEvent);

      await this.rmqService.publish(MessagePatterns.event_update, {
        id: savedEvent.id,
        organizerId: savedEvent.organizerId,
        capacity: savedEvent.capacity,
        date: savedEvent.date,
        isActive: savedEvent.isActive,
      });

      return savedEvent;
    });
  }

  async remove(id: string, organizerId: string): Promise<void> {
    return await this.eventRepository.manager.transaction(async (manager) => {
      const event = await manager.findOne(Event, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!event) {
        throw new NotFoundException(`Event not found`);
      }

      if (event.organizerId !== organizerId) {
        throw new BadRequestException(
          'You do not have permission to delete this event',
        );
      }

      event.isActive = false;
      await manager.save(Event, event);

      await this.rmqService.publish(MessagePatterns.event_delete, {
        id,
        organizerId,
        timestamp: new Date().toISOString(),
      });

      this.logger.debug(`Successfully deactivated event ${id}`);
    });
  }

  async checkEventAvailability(eventId: string): Promise<boolean> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId, isActive: true },
    });

    if (!event) {
      throw new NotFoundException('Event not found or inactive');
    }

    return event.capacity > 0;
  }

  async getUpcomingEvents(): Promise<Event[]> {
    return this.eventRepository.find({
      where: {
        date: MoreThan(new Date()),
        isActive: true,
      },
      order: {
        date: 'ASC',
      },
      take: 10,
    });
  }
}
