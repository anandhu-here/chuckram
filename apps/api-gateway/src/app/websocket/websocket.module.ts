// apps/api-gateway/src/app/websocket/websocket.module.ts

import { Module } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [BlockchainModule, AuthModule],
  providers: [WebsocketGateway],
  exports: [WebsocketGateway],
})
export class WebsocketModule {}
