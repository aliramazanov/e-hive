import { ApiProperty } from '@nestjs/swagger';

export class LoginResponseDto {
  @ApiProperty()
  access_token: string;

  @ApiProperty()
  refresh_token: string;

  @ApiProperty({
    example: {
      id: 'uuid',
      userId: 'uuid',
      email: 'user@example.com',
    },
  })
  user: {
    id: string;
    userId: string;
    email: string;
  };
}
