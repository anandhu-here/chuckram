// apps/blockchain-node/src/app/api/api.service.ts

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiService {
  constructor(private readonly configService: ConfigService) {}

  health() {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: this.configService.get<string>('environment'),
    };
  }

  version() {
    return {
      version: '1.0.0',
      name: 'Digital Chuckram Blockchain Node',
      network: this.configService.get<string>('network.name'),
    };
  }
}
