import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsString,
  ValidateNested,
} from 'class-validator';

export class BulkCreateUserDto {
  @IsString()
  @IsEmail()
  email: string;
}

export class BulkCreateUsersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkCreateUserDto)
  users: BulkCreateUserDto[];
}
