// apps/blockchain-node/src/app/node/node.controller.ts

import { Controller, Get, Post, UseGuards, Logger } from '@nestjs/common';
import { ApiKeyGuard } from '../api/guards/api-key.guard';
import { NodeService } from './node.service';

@Controller('node')
@UseGuards(ApiKeyGuard)
export class NodeController {
  private readonly logger = new Logger(NodeController.name);

  constructor(private readonly nodeService: NodeService) {}

  @Get()
  getNodeInfo() {
    return this.nodeService.getNodeInfo();
  }

  @Get('status')
  getStatus() {
    return { status: this.nodeService.getStatus() };
  }

  @Post('start')
  async startNode() {
    this.logger.log('Received request to start node');
    await this.nodeService.start();
    return { success: true, message: 'Node started successfully' };
  }

  @Post('stop')
  async stopNode() {
    this.logger.log('Received request to stop node');
    await this.nodeService.stop();
    return { success: true, message: 'Node stopped successfully' };
  }
}
