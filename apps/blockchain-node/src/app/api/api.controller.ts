// apps/blockchain-node/src/app/api/api.controller.ts

import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from './guards/api-key.guard';
import { ApiService } from './api.service';

@Controller()
@UseGuards(ApiKeyGuard)
export class ApiController {
  constructor(private readonly apiService: ApiService) {}

  @Get('health')
  health() {
    return this.apiService.health();
  }

  @Get('version')
  version() {
    return this.apiService.version();
  }
}
