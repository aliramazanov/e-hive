import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'The password reset token',
  })
  token: string;

  @ApiProperty({
    description: 'The new password',
    minimum: 8,
  })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
