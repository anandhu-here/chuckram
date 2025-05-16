// apps/api-gateway/src/app/websocket/guards/ws-jwt.guard.ts

import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { AuthService } from '../../auth/auth.service';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient();
    const token = this.extractTokenFromHeader(
      client.handshake.headers.authorization
    );

    if (!token) {
      throw new WsException('Unauthorized');
    }

    try {
      const payload = await this.authService.verifyToken(token);
      client.user = payload;
      return true;
    } catch (error) {
      throw new WsException('Unauthorized');
    }
  }

  private extractTokenFromHeader(header: string): string | undefined {
    if (!header) {
      return undefined;
    }

    const [type, token] = header.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
