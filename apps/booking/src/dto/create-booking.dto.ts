import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class CreateBookingDto {
  @IsNotEmpty()
  @IsString()
  userId: string;
 
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  eventIds: string[];
 }