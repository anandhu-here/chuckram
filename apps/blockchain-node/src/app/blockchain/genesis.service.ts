// apps/blockchain-node/src/app/blockchain/genesis.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

@Injectable()
export class GenesisService {
  private readonly logger = new Logger(GenesisService.name);

  constructor(private readonly configService: ConfigService) {}

  // Load genesis block from file or create default
  async loadGenesisBlock(): Promise<any> {
    const genesisFile = this.configService.get<string>(
      'blockchain.genesisFile'
    );

    // Check if genesis file exists
    if (genesisFile && fs.existsSync(genesisFile)) {
      try {
        const fileContent = fs.readFileSync(genesisFile, 'utf-8');
        const genesisBlock = JSON.parse(fileContent);

        this.logger.log(`Loaded genesis block from file: ${genesisFile}`);
        return genesisBlock;
      } catch (error: any) {
        this.logger.error(`Error loading genesis file: ${error.message}`);
      }
    }

    // If file doesn't exist or error occurred, create default genesis block
    this.logger.log('Creating default genesis block');
    return this.createDefaultGenesisBlock();
  }

  // Create a default genesis block
  private createDefaultGenesisBlock(): any {
    const now = Date.now();

    // Genesis block header
    const header = {
      version: 1,
      previousHash: '0'.repeat(64), // All zeros for genesis block
      merkleRoot: '0'.repeat(64), // Will be calculated
      timestamp: now,
      height: 0,
      validatorAddress: '0'.repeat(40), // System address for genesis
      validatorSignature: null, // No signature for genesis
    };

    // Create genesis transactions
    const transactions = this.createGenesisTransactions(now);

    // Calculate merkle root
    const merkleRoot = this.calculateMerkleRoot(transactions);
    header.merkleRoot = merkleRoot;

    // Create complete block
    const genesisBlock = {
      header,
      transactions,
      nonce: 0,
      hash: '', // Will be calculated
    };

    // Calculate and set block hash
    genesisBlock.hash = this.calculateBlockHash(genesisBlock);

    // Save genesis block to file
    this.saveGenesisBlock(genesisBlock);

    return genesisBlock;
  }

  // Create genesis transactions
  private createGenesisTransactions(timestamp: number): any[] {
    // In a real implementation, this would include:
    // 1. Initial token allocation to government reserves
    // 2. Initial validator registrations
    // 3. System configuration transactions

    // For simplicity, we'll just create a single mint transaction
    const mintTx = {
      id: this.generateTxId('mint', '0', timestamp),
      from: '0'.repeat(40), // System address
      to: 'government-treasury',
      amount: '10000000000', // 10 billion initial supply
      fee: '0',
      timestamp,
      type: 'MINT',
      data: {
        description: 'Genesis block initial supply',
      },
      signature: '0'.repeat(128), // System signature
      nonce: 0,
    };

    return [mintTx];
  }

  // Calculate block hash
  private calculateBlockHash(block: any): string {
    const header = block.header;
    const dataToHash = `${header.version}${header.previousHash}${header.merkleRoot}${header.timestamp}${header.height}${header.validatorAddress}${block.nonce}`;
    return createHash('sha256').update(dataToHash).digest('hex');
  }

  // Calculate merkle root (simplified)
  private calculateMerkleRoot(transactions: any[]): string {
    if (transactions.length === 0) {
      return '0'.repeat(64);
    }

    const txHashes = transactions.map((tx) => tx.id);

    // For simplicity, we'll just concatenate and hash
    // In a real implementation, this would build a proper merkle tree
    return createHash('sha256').update(txHashes.join('')).digest('hex');
  }

  // Generate transaction ID
  private generateTxId(
    type: string,
    address: string,
    timestamp: number
  ): string {
    const data = `${type}:${address}:${timestamp}:${Math.random()}`;
    return createHash('sha256').update(data).digest('hex');
  }

  // Save genesis block to file
  private saveGenesisBlock(genesisBlock: any): void {
    const genesisFile = this.configService.get<string>(
      'blockchain.genesisFile'
    );

    if (!genesisFile) {
      this.logger.warn('No genesis file configured, skipping save');
      return;
    }

    try {
      // Ensure directory exists
      const dir = path.dirname(genesisFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write to file
      fs.writeFileSync(genesisFile, JSON.stringify(genesisBlock, null, 2));
      this.logger.log(`Genesis block saved to file: ${genesisFile}`);
    } catch (error: any) {
      this.logger.error(`Error saving genesis file: ${error.message}`);
    }
  }
}
