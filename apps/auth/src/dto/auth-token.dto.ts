import { ApiProperty } from '@nestjs/swagger';

export class TokenDto {
  @ApiProperty({
    description: 'The token to be verified',
  })
  token: string;
}

export class RefreshTokenDto {
  @ApiProperty({
    description: 'The refresh token',
  })
  refreshToken: string;
}
