// apps/blockchain-node/src/app/api/guards/api-key.guard.ts

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = this.configService.get<string>('api.apiKey');

    // Check API key in header
    const providedKey = request.headers['x-api-key'];

    // For development, allow access without API key if it's not set
    if (
      this.configService.get<string>('environment') === 'development' &&
      !apiKey
    ) {
      return true;
    }

    if (!providedKey || providedKey !== apiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }
}
