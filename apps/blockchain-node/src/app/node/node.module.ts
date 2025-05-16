// apps/blockchain-node/src/app/node/node.module.ts

import { Module } from '@nestjs/common';
import { NodeService } from './node.service';
import { NodeController } from './node.controller';

@Module({
  providers: [NodeService],
  controllers: [NodeController],
  exports: [NodeService],
})
export class NodeModule {}
