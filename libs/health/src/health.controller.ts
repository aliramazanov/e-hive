import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import { Public } from '@app/common';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  check() {
    return this.healthService.check();
  }

  @Public()
  @Get('liveness')
  liveness() {
    return this.healthService.getLiveness();
  }

  @Public()
  @Get('readiness')
  readiness() {
    return this.healthService.getReadiness();
  }
}
