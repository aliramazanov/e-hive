import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { BookingStatus } from '../enum/booking-status.enum';

@Entity('booking')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string;

  @Column('text', { array: true })
  eventIds: string[];

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.pending,
  })
  status: BookingStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    price?: number;
    paymentId?: string;
    paymentStatus?: string;
    cancellationReason?: string;
    notes?: string;
  };

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;
}
