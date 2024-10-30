import { AbstractRepository } from '@app/common';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Booking } from '../entity/booking.entity';

@Injectable()
export class BookingRepository extends AbstractRepository<Booking> {
  protected readonly logger = new Logger(BookingRepository.name);

  constructor(
    @InjectRepository(Booking)
    entityRepository: Repository<Booking>,
    entityManager: EntityManager,
  ) {
    super(entityRepository, entityManager);
  }
}
