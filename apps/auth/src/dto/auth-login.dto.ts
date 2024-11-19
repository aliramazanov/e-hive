import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
    required: true,
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'yourpassword',
    description: 'User password',
    required: true,
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;
}
