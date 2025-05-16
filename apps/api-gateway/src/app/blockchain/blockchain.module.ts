// apps/api-gateway/src/app/blockchain/blockchain.module.ts

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BlockchainService } from './blockchain.service';
import { BlockchainController } from './blockchain.controller';
import { BlockchainResolver } from './blockchain.resolver';

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        baseURL: configService.get<string>('blockchain.url'),
        headers: {
          'x-api-key': configService.get<string>('blockchain.apiKey'),
        },
        timeout: 5000,
      }),
    }),
  ],
  controllers: [BlockchainController],
  providers: [BlockchainService, BlockchainResolver],
  exports: [BlockchainService],
})
export class BlockchainModule {}
