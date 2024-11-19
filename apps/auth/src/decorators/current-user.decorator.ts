import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export class AuthUser {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  email: string;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
