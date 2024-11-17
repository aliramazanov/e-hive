import { IsInt, Max, Min } from 'class-validator';

export class DeactivateUsersDto {
  @IsInt()
  @Min(1)
  @Max(365)
  daysInactive: number;
}
