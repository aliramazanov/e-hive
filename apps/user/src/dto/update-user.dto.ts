import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @Length(2, 50)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(2, 50)
  lastName?: string;

  @IsOptional()
  @IsString()
  @Length(3, 20)
  @Matches(/^[a-zA-Z0-9_-]*$/, {
    message:
      'Username can only contain letters, numbers, underscores and dashes',
  })
  username?: string;
}
