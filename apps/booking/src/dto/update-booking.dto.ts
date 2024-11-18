import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BookingStatus } from '../enum/booking-status.enum';

export class UpdateBookingDto {
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @IsOptional()
  @IsString()
  cancellationReason?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
