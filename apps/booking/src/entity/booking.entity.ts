import { AbstractEntity } from '@app/common';
import { Column, Entity } from 'typeorm';

@Entity()
export class Booking extends AbstractEntity<Booking> {
  @Column()
  eventId: string;

  @Column()
  bookerId: string;

  @Column()
  timestamp: Date;

  constructor(partial: Partial<Booking>) {
    super(partial);
  }
}
