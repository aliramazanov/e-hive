import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
  ) {}

  private getRequest(context: ExecutionContext) {
    const contextType = context.getType();

    switch (contextType) {
      case 'http':
        return context.switchToHttp().getRequest();
      case 'rpc':
        return context.switchToRpc().getData();
      default:
        throw new Error('Unsupported context type');
    }
  }

  private extractTokenFromHeader(request: any): string | null {
    const [type, token] = request.headers?.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : null;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = this.getRequest(context);
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const response = await firstValueFrom(
        this.authClient.send('validate_token', { token }),
      );

      if (!response.valid) {
        throw new UnauthorizedException(response.error || 'Invalid token');
      }

      request.user = response.user;
      return true;
    } catch (error) {
      if (error.name === 'TimeoutError') {
        throw new UnauthorizedException('Authentication service timeout');
      }
      throw new UnauthorizedException(error.message || 'Invalid token');
    }
  }
}
