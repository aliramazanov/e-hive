import {
  IsOptional,
  IsString,
  IsBoolean,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UserSearchQuery {
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isActive?: boolean;

  @IsOptional()
  @IsEnum(['user', 'admin', 'moderator'])
  role?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @Transform(({ value }) => new Date(value))
  createdAfter?: Date;

  @IsOptional()
  @Transform(({ value }) => new Date(value))
  createdBefore?: Date;

  @IsOptional()
  @Transform(({ value }) => new Date(value))
  lastLoginAfter?: Date;

  @IsOptional()
  @IsInt()
  @Min(0)
  skip?: number = 0;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'lastLoginAt' | 'email' | 'firstName' = 'createdAt';

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
