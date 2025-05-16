// apps/blockchain-node/src/app/blockchain/blockchain.service.ts

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { GenesisService } from './genesis.service';
import { StateManager } from './state-manager.service';
import { createHash } from 'crypto';

@Injectable()
export class BlockchainService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainService.name);
  private blocks: Map<string, any> = new Map(); // hash -> block
  private blocksByHeight: Map<number, string> = new Map(); // height -> hash
  private lastBlockHash: string | undefined;
  private chainHeight: number = 0;
  private initialized: boolean = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly genesisService: GenesisService,
    private readonly stateManager: StateManager,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing blockchain service...');

    try {
      await this.initialize();
      this.initialized = true;
      this.logger.log(`Blockchain initialized at height ${this.chainHeight}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to initialize blockchain: ${error.message}`,
        error.stack
      );
    }
  }

  // Initialize the blockchain with genesis block
  private async initialize(): Promise<void> {
    // Check if we already have blocks
    if (this.blocks.size > 0) {
      this.logger.warn('Blockchain already initialized');
      return;
    }

    this.logger.log('Loading genesis block...');

    // Get genesis block from genesis service
    const genesisBlock = await this.genesisService.loadGenesisBlock();

    // Add genesis block to blockchain
    this.addBlock(genesisBlock);

    // Initialize state with genesis block
    await this.stateManager.initialize(genesisBlock);

    this.logger.log(`Genesis block loaded with hash ${genesisBlock.hash}`);
  }

  // Get a block by hash
  getBlock(hash: string): any {
    return this.blocks.get(hash);
  }

  // Get a block by height
  getBlockByHeight(height: number): any {
    const hash = this.blocksByHeight.get(height);
    if (!hash) return null;
    return this.getBlock(hash);
  }

  // Get latest blocks
  getLatestBlocks(limit: number = 10): any[] {
    const blocks = [];

    for (
      let height = this.chainHeight;
      height > Math.max(0, this.chainHeight - limit);
      height--
    ) {
      const block = this.getBlockByHeight(height);
      if (block) {
        blocks.push(block);
      }
    }

    return blocks;
  }

  // Get block range
  getBlockRange(startHeight: number, endHeight: number): any[] {
    const blocks = [];

    for (let height = startHeight; height <= endHeight; height++) {
      const block = this.getBlockByHeight(height);
      if (block) {
        blocks.push(block);
      }
    }

    return blocks;
  }

  // Add a new block to the chain
  async addBlock(block: any): Promise<boolean> {
    // Check if block already exists
    if (this.blocks.has(block.hash)) {
      this.logger.debug(`Block ${block.hash} already exists in blockchain`);
      return false;
    }

    // Validate block (real implementation would be more extensive)
    if (!this.validateBlock(block)) {
      this.logger.warn(`Invalid block ${block.hash}`);
      return false;
    }

    // Add block to chain
    this.blocks.set(block.hash, block);
    this.blocksByHeight.set(block.header.height, block.hash);

    // Update chain state if this is a new highest block
    if (block.header.height > this.chainHeight) {
      this.chainHeight = block.header.height;
      this.lastBlockHash = block.hash;

      // Update state with new block
      await this.stateManager.applyBlock(block);

      // Emit state updated event
      this.eventEmitter.emit('blockchain.state.updated', {
        height: this.chainHeight,
        lastBlockHash: this.lastBlockHash,
      });
    }

    // Emit block added event
    this.eventEmitter.emit('blockchain.block.added', block);

    this.logger.log(
      `Added block ${block.hash} at height ${block.header.height} with ${block.transactions.length} transactions`
    );

    return true;
  }

  // Validate block (simplified)
  validateBlock(block: any): boolean {
    // Check block structure
    if (!block || !block.header || !block.transactions || !block.hash) {
      this.logger.warn('Invalid block structure');
      return false;
    }

    // Check block hash
    const calculatedHash = this.calculateBlockHash(block);
    if (calculatedHash !== block.hash) {
      this.logger.warn(
        `Block hash mismatch: ${calculatedHash} != ${block.hash}`
      );
      return false;
    }

    // If it's genesis block, validation is different
    if (block.header.height === 0) {
      return this.validateGenesisBlock(block);
    }

    // Check previous block hash
    const prevBlock = this.getBlockByHeight(block.header.height - 1);
    if (!prevBlock) {
      this.logger.warn(
        `Previous block at height ${block.header.height - 1} not found`
      );
      return false;
    }

    if (prevBlock.hash !== block.header.previousHash) {
      this.logger.warn(
        `Previous hash mismatch: ${prevBlock.hash} != ${block.header.previousHash}`
      );
      return false;
    }

    // Check block height
    if (block.header.height !== prevBlock.header.height + 1) {
      this.logger.warn(
        `Block height mismatch: ${block.header.height} != ${
          prevBlock.header.height + 1
        }`
      );
      return false;
    }

    // Check timestamp
    if (block.header.timestamp <= prevBlock.header.timestamp) {
      this.logger.warn(
        `Block timestamp invalid: ${block.header.timestamp} <= ${prevBlock.header.timestamp}`
      );
      return false;
    }

    // Check merkle root
    const calculatedMerkleRoot = this.calculateMerkleRoot(block.transactions);
    if (calculatedMerkleRoot !== block.header.merkleRoot) {
      this.logger.warn(
        `Merkle root mismatch: ${calculatedMerkleRoot} != ${block.header.merkleRoot}`
      );
      return false;
    }

    // Validate transactions (simplified)
    for (const tx of block.transactions) {
      if (!this.validateTransaction(tx)) {
        this.logger.warn(`Invalid transaction in block: ${tx.id}`);
        return false;
      }
    }

    return true;
  }

  // Validate genesis block
  private validateGenesisBlock(block: any): boolean {
    // The genesis block is validated differently
    // In a real implementation, we would check against a hardcoded genesis block
    return (
      block.header.height === 0 && block.header.previousHash === '0'.repeat(64)
    );
  }

  // Validate transaction (simplified)
  private validateTransaction(tx: any): boolean {
    // In a real implementation, this would verify signatures, check balances, etc.
    return true;
  }

  // Calculate block hash
  calculateBlockHash(block: any): string {
    const header = block.header;
    const dataToHash = `${header.version}${header.previousHash}${header.merkleRoot}${header.timestamp}${header.height}${header.validatorAddress}${block.nonce}`;
    return createHash('sha256').update(dataToHash).digest('hex');
  }

  // Calculate merkle root from transactions (simplified)
  calculateMerkleRoot(transactions: any[]): string {
    if (transactions.length === 0) {
      return '0'.repeat(64);
    }

    const txHashes = transactions.map((tx) => tx.id);

    // For simplicity, we'll just concatenate and hash
    // In a real implementation, this would build a proper merkle tree
    return createHash('sha256').update(txHashes.join('')).digest('hex');
  }

  // Get current blockchain state
  getBlockchainState(): any {
    return {
      height: this.chainHeight,
      lastBlockHash: this.lastBlockHash,
      blockCount: this.blocks.size,
      isInitialized: this.initialized,
      genesisHash: this.getBlockByHeight(0)?.hash,
    };
  }

  // Handle new block from network
  @OnEvent('blockchain.block.received')
  async handleReceivedBlock(payload: {
    block: any;
    peerId: string;
  }): Promise<void> {
    const { block, peerId } = payload;

    try {
      // First, validate and add the block
      const success = await this.addBlock(block);

      if (success) {
        // If this is a new highest block, we need to check for chain reorg
        if (block.header.height > this.chainHeight) {
          await this.handlePotentialReorg(block);
        }

        // Broadcast the block to other peers
        this.eventEmitter.emit('blockchain.block.relayable', block);
      }
    } catch (error: any) {
      this.logger.error(
        `Error processing block from peer ${peerId}: ${error.message}`
      );
    }
  }

  // Handle potential chain reorganization
  private async handlePotentialReorg(newBlock: any): Promise<void> {
    // In a real implementation, this would handle chain reorgs
    // For now, we just log and accept the new highest block
    this.logger.debug(
      `New highest block ${newBlock.hash} at height ${newBlock.header.height}`
    );
  }

  // Get transaction by ID
  getTransaction(txId: string): { transaction: any; block: any } | null {
    for (const block of this.blocks.values()) {
      for (const tx of block.transactions) {
        if (tx.id === txId) {
          return { transaction: tx, block };
        }
      }
    }

    return null;
  }

  // Get transactions for a specific address
  getAddressTransactions(address: string, limit: number = 100): any[] {
    const transactions = [];

    // Iterate through blocks from newest to oldest
    for (let height = this.chainHeight; height >= 0; height--) {
      const block = this.getBlockByHeight(height);
      if (!block) continue;

      for (const tx of block.transactions) {
        if (tx.from === address || tx.to === address) {
          transactions.push({
            ...tx,
            blockHeight: block.header.height,
            blockHash: block.hash,
            timestamp: block.header.timestamp,
          });

          if (transactions.length >= limit) {
            return transactions;
          }
        }
      }
    }

    return transactions;
  }

  // Get block count
  getBlockCount(): number {
    return this.blocks.size;
  }

  // Get transaction count
  getTransactionCount(): number {
    let count = 0;
    for (const block of this.blocks.values()) {
      count += block.transactions.length;
    }
    return count;
  }

  // Check if blockchain has a specific block
  hasBlock(hash: string): boolean {
    return this.blocks.has(hash);
  }

  // Get chain height
  getChainHeight(): number {
    return this.chainHeight;
  }

  // Check if a block has been finalized
  isBlockFinalized(blockHash: string): boolean {
    const block = this.getBlock(blockHash);
    if (!block) return false;

    const confirmations: any = this.configService.get<number>(
      'blockchain.confirmations'
    );
    return this.chainHeight - block.header.height >= confirmations;
  }
}
