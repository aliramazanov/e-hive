import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private startTime: Date;

  constructor(private readonly configService: ConfigService) {
    this.startTime = new Date();
  }

  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: this.getUptime(),
      service: this.configService.get('SERVICE_NAME', 'unknown'),
      version: this.configService.get('VERSION', '1.0.0'),
    };
  }

  getLiveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  getReadiness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      checks: {
        memory: this.getMemoryUsage(),
      },
    };
  }

  private getUptime(): string {
    const uptime = new Date().getTime() - this.startTime.getTime();
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    return `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
  }

  private getMemoryUsage() {
    const used = process.memoryUsage();
    return {
      status: 'ok',
      heapTotal: Math.round(used.heapTotal / 1024 / 1024) + 'MB',
      heapUsed: Math.round(used.heapUsed / 1024 / 1024) + 'MB',
      rss: Math.round(used.rss / 1024 / 1024) + 'MB',
    };
  }
}
