// apps/blockchain-node/src/app/app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Configuration
import configuration from '../config/configuration';

// Core modules
import { BlockchainModule } from './blockchain/blockchain.module';
import { ConsensusModule } from './consensus/consensus.module';
import { P2pModule } from './p2p/p2p.module';
import { WalletModule } from './wallet/wallet.module';
import { MempoolModule } from './mempool/mempool.module';
import { ApiModule } from './api/api.module';
import { NodeModule } from './node/node.module';
import { ValidatorModule } from './validator/validator.module';
import { StorageModule } from './storage/storage.module';
import { BlockProducerModule } from './block-producer/block-producer.module';
import { SyncModule } from './sync/sync.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // Scheduling for periodic tasks
    ScheduleModule.forRoot(),

    // Event emitting for blockchain events
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
      verboseMemoryLeak: true,
    }),

    // Core blockchain modules
    BlockchainModule,
    ConsensusModule,
    P2pModule,
    WalletModule,
    MempoolModule,

    // Node management
    NodeModule,
    ValidatorModule,
    BlockProducerModule,
    SyncModule,
    StorageModule,

    // API for internal access
    ApiModule,
  ],
})
export class AppModule {}
