import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class PageDto {
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit: number = 10;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  offset: number = 0;

  @IsString()
  @IsOptional()
  sortBy?: string = 'date';

  @IsString()
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  dateFrom?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  dateTo?: Date;

  @IsString()
  organizerId: any;
}
