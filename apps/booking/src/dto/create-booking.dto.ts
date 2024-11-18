import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsArray()
  @IsUUID('4', { each: true })
  eventIds: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}
