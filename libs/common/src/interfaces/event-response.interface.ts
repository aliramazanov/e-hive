import { IEvent } from './event.interface';

export class EventResponse implements IEvent {
  id: string;
  title: string;
  description: string;
  date: Date;
  location: string;
  capacity: number;
  createdAt: Date;
  updatedAt: Date;
}
