// apps/blockchain-node/src/app/node/node.service.ts

import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class NodeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NodeService.name);
  private isRunning = false;
  private isSyncing = false;
  private nodeInfo: any = {};
  private startTime: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2
  ) {
    this.startTime = Date.now();

    // Initialize node info
    this.nodeInfo = {
      nodeName: this.configService.get<string>('nodeName'),
      network: this.configService.get<string>('network.name'),
      version: '1.0.0',
      isValidator: this.configService.get<boolean>('validator.isValidator'),
      validatorType: this.configService.get<string>('validator.validatorType'),
      environment: this.configService.get<string>('environment'),
    };
  }

  async onModuleInit() {
    this.logger.log('Initializing node...');

    try {
      // Subscribe to events
      this.setupEventListeners();

      // Start the node
      await this.start();

      this.logger.log('Node successfully initialized and started');
    } catch (error: any) {
      this.logger.error(
        `Failed to initialize node: ${error.message}`,
        error.stack
      );
      // In production, we might want to exit if initialization fails
      if (this.configService.get<string>('environment') === 'production') {
        process.exit(1);
      }
    }
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down node...');

    try {
      await this.stop();
      this.logger.log('Node successfully shut down');
    } catch (error: any) {
      this.logger.error(`Error during node shutdown: ${error.message}`);
    }
  }

  private setupEventListeners() {
    // Blockchain events
    this.eventEmitter.on('blockchain.block.new', (block) => {
      this.logger.debug(
        `New block added: ${block.hash} at height ${block.header.height}`
      );
    });

    this.eventEmitter.on('blockchain.state.updated', (state) => {
      this.nodeInfo.blockHeight = state.height;
      this.nodeInfo.lastBlockHash = state.lastBlockHash;
    });

    // P2P events
    this.eventEmitter.on('p2p.peer.connected', (peer) => {
      this.logger.debug(`Peer connected: ${peer.id}`);
    });

    this.eventEmitter.on('p2p.peer.disconnected', (peer) => {
      this.logger.debug(`Peer disconnected: ${peer.id}`);
    });

    // Sync events
    this.eventEmitter.on('sync.started', () => {
      this.isSyncing = true;
      this.logger.log('Blockchain synchronization started');
    });

    this.eventEmitter.on('sync.completed', (blockHeight) => {
      this.isSyncing = false;
      this.logger.log(
        `Blockchain synchronization completed at height ${blockHeight}`
      );
    });

    // Validator events
    this.eventEmitter.on('validator.proposer.selected', (validatorAddress) => {
      this.logger.debug(
        `Validator selected as block proposer: ${validatorAddress}`
      );
    });

    // Error events
    this.eventEmitter.on('error.*', (error: any) => {
      this.logger.error(`Error event: ${error.message}`, error.stack);
    });
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Node is already running');
      return;
    }

    this.logger.log('Starting node...');

    // Here we would typically:
    // 1. Initialize the blockchain
    // 2. Start P2P networking
    // 3. Set up validators if needed
    // 4. Start the block producer if this is a validator
    // 5. Begin blockchain synchronization

    // For now we'll emit events to simulate this
    this.eventEmitter.emit('node.starting');

    // Simulate blockchain sync
    setTimeout(() => {
      this.eventEmitter.emit('sync.started');

      // Simulate sync completion after a delay
      setTimeout(() => {
        this.eventEmitter.emit('sync.completed', 1000);
        this.nodeInfo.blockHeight = 1000;
        this.nodeInfo.isSynced = true;
      }, 5000);
    }, 1000);

    this.isRunning = true;
    this.eventEmitter.emit('node.started');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn('Node is already stopped');
      return;
    }

    this.logger.log('Stopping node...');

    // Here we would typically:
    // 1. Stop accepting new transactions
    // 2. Disconnect from peers gracefully
    // 3. Save blockchain state
    // 4. Close any open connections

    this.eventEmitter.emit('node.stopping');

    // Simulate stop delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    this.isRunning = false;
    this.eventEmitter.emit('node.stopped');
  }

  getNodeInfo(): any {
    // Update dynamic info
    this.nodeInfo.isRunning = this.isRunning;
    this.nodeInfo.isSyncing = this.isSyncing;
    this.nodeInfo.uptime = Date.now() - this.startTime;

    return this.nodeInfo;
  }

  getStatus(): string {
    if (!this.isRunning) return 'stopped';
    if (this.isSyncing) return 'syncing';
    return 'running';
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async healthCheck() {
    this.logger.debug('Performing health check...');

    // Here we would check:
    // 1. Blockchain state integrity
    // 2. Peer connections
    // 3. System resources
    // 4. Database connectivity

    const status = this.getStatus();
    this.logger.debug(`Health check completed, node status: ${status}`);

    // Emit health stats
    this.eventEmitter.emit('node.health', {
      status,
      blockHeight: this.nodeInfo.blockHeight,
      peerCount: 0, // Would come from P2P service
      mempoolSize: 0, // Would come from Mempool service
      uptime: this.nodeInfo.uptime,
      timestamp: Date.now(),
    });
  }
}
