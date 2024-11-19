import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class EmailDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'The email address',
  })
  @IsEmail()
  email: string;
}
