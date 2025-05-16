// apps/api-gateway/src/app/health/health.controller.ts

import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { Public } from '../auth/decorators/public.decorator';
import { ConfigService } from '@nestjs/config';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private configService: ConfigService
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Check API health' })
  check() {
    const blockchainUrl = this.configService.get<string>('blockchain.url');

    return this.health.check([
      // Check API Gateway memory usage
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024), // 150MB
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024), // 300MB

      // Check disk usage
      () =>
        this.disk.checkStorage('disk', { path: '/', thresholdPercent: 0.9 }),

      // Check blockchain node connection
      () => this.http.pingCheck('blockchain_node', `${blockchainUrl}/health`),
    ]);
  }
}
