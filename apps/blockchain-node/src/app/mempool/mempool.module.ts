// apps/blockchain-node/src/app/mempool/mempool.module.ts

import { Module } from '@nestjs/common';
import { MempoolService } from './mempool.service';
import { MempoolController } from './mempool.controller';

@Module({
  providers: [MempoolService],
  controllers: [MempoolController],
  exports: [MempoolService],
})
export class MempoolModule {}
