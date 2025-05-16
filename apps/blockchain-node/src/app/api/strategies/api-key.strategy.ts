// apps/blockchain-node/src/app/api/strategies/api-key.strategy.ts

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-headerapikey';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
  constructor(private readonly configService: ConfigService) {
    super(
      { header: 'X-API-Key', prefix: '' },
      true,
      async (apiKey: any, done: any) => {
        const expectedApiKey = this.configService.get<string>('api.apiKey');

        // For development, allow access without API key if it's not set
        if (
          this.configService.get<string>('environment') === 'development' &&
          !expectedApiKey
        ) {
          return done(null, true);
        }

        if (apiKey === expectedApiKey) {
          return done(null, true);
        }

        return done(null, false);
      }
    );
  }
}
