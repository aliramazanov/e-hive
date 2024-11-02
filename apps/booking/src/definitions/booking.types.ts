import { BookingStatus } from '../enum/booking-status.enum';

export interface BookingQueryParams {
  startDate?: Date;
  endDate?: Date;
  status?: BookingStatus;
  eventId?: string;
  bookerId?: string;
}
