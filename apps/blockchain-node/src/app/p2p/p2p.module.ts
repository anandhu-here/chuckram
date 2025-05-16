// apps/blockchain-node/src/app/p2p/p2p.module.ts

import { Module } from '@nestjs/common';
import { P2pService } from './p2p.service';
import { PeerManager } from './peer-manager.service';
import { MessageHandler } from './message-handler.service';

@Module({
  providers: [P2pService, PeerManager, MessageHandler],
  exports: [P2pService],
})
export class P2pModule {}
