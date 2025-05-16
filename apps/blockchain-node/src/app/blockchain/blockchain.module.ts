// apps/blockchain-node/src/app/blockchain/blockchain.module.ts

import { Module } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { BlockchainController } from './blockchain.controller';
import { GenesisService } from './genesis.service';
import { StateManager } from './state-manager.service';

@Module({
  providers: [BlockchainService, GenesisService, StateManager],
  controllers: [BlockchainController],
  exports: [BlockchainService, StateManager],
})
export class BlockchainModule {}
