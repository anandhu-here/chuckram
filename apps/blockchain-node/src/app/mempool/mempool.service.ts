// apps/blockchain-node/src/app/mempool/mempool.service.ts

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class MempoolService implements OnModuleInit {
  private readonly logger = new Logger(MempoolService.name);
  private pendingTransactions: Map<string, any> = new Map();
  private transactionsByAccount: Map<string, Set<string>> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing mempool service...');
  }

  // Add transaction to mempool
  async addTransaction(transaction: any): Promise<boolean> {
    // Check if transaction already exists
    if (this.pendingTransactions.has(transaction.id)) {
      this.logger.debug(`Transaction ${transaction.id} already in mempool`);
      return false;
    }

    // Check mempool size limit
    const maxSize: any = this.configService.get<number>('mempool.maxSize');
    if (this.pendingTransactions.size >= maxSize) {
      this.logger.warn(
        `Mempool full (${this.pendingTransactions.size}/${maxSize}), rejecting transaction`
      );
      throw new Error('Mempool is full');
    }

    // Check per-account transaction limit
    const from = transaction.from;
    const maxSizePerAccount: any = this.configService.get<number>(
      'mempool.maxSizePerAccount'
    );
    const accountTransactions: any = this.getTransactionsByAccount(from);

    if (accountTransactions.size >= maxSizePerAccount) {
      this.logger.warn(
        `Account ${from} has reached transaction limit (${accountTransactions.size}/${maxSizePerAccount})`
      );
      throw new Error('Account transaction limit reached');
    }

    // Check minimum fee
    const minFee: any = this.configService.get<number>('mempool.minFee');
    if (Number(transaction.fee) < minFee) {
      this.logger.warn(
        `Transaction ${transaction.id} fee (${transaction.fee}) below minimum (${minFee})`
      );
      throw new Error(
        `Transaction fee below minimum. Required: ${minFee}, Provided: ${transaction.fee}`
      );
    }

    // Add timestamp to track expiration
    const txWithTimestamp = {
      ...transaction,
      addedAt: Date.now(),
    };

    // Add to mempool
    this.pendingTransactions.set(transaction.id, txWithTimestamp);

    // Add to account index
    if (!this.transactionsByAccount.has(from)) {
      this.transactionsByAccount.set(from, new Set());
    }
    this.transactionsByAccount.get(from)!.add(transaction.id);

    // Emit event
    this.eventEmitter.emit('mempool.transaction.added', transaction);

    this.logger.debug(
      `Added transaction ${transaction.id} to mempool (from: ${from}, fee: ${transaction.fee})`
    );
    return true;
  }

  // Remove transaction from mempool
  removeTransaction(txId: string): boolean {
    // Check if transaction exists
    const transaction = this.pendingTransactions.get(txId);
    if (!transaction) {
      return false;
    }

    // Remove from mempool
    this.pendingTransactions.delete(txId);

    // Remove from account index
    const from = transaction.from;
    if (this.transactionsByAccount.has(from)) {
      this.transactionsByAccount.get(from)!.delete(txId);

      // Clean up empty sets
      if (this.transactionsByAccount.get(from)!.size === 0) {
        this.transactionsByAccount.delete(from);
      }
    }

    this.logger.debug(`Removed transaction ${txId} from mempool`);
    return true;
  }

  // Get transaction from mempool
  getTransaction(txId: string): any {
    return this.pendingTransactions.get(txId);
  }

  // Get all transactions in mempool
  getAllTransactions(): any[] {
    return Array.from(this.pendingTransactions.values());
  }

  // Get transactions by account
  getTransactionsByAccount(address: string): Set<string> {
    return this.transactionsByAccount.get(address) || new Set();
  }

  // Get pending transaction count
  getPendingCount(): number {
    return this.pendingTransactions.size;
  }

  // Get transactions for new block (sorted by fee)
  getTransactionsForBlock(maxCount: number): any[] {
    // Sort transactions by fee (highest first)
    const sorted = this.getAllTransactions().sort(
      (a, b) => Number(b.fee) - Number(a.fee)
    );

    // Take requested number of transactions
    return sorted.slice(0, maxCount);
  }

  // Check if transaction exists
  hasTransaction(txId: string): boolean {
    return this.pendingTransactions.has(txId);
  }

  // Clear the mempool
  clear(): number {
    const count = this.pendingTransactions.size;
    this.pendingTransactions.clear();
    this.transactionsByAccount.clear();
    this.logger.log(`Cleared ${count} transactions from mempool`);
    return count;
  }

  // Handle incoming transaction from P2P network
  @OnEvent('mempool.transaction.received')
  async handleReceivedTransaction(payload: {
    transaction: any;
    peerId: string;
  }): Promise<void> {
    const { transaction, peerId } = payload;

    try {
      // Validate transaction (in real implementation, this would be more extensive)
      // For now we just check the basics
      if (
        !transaction.id ||
        !transaction.from ||
        !transaction.to ||
        !transaction.amount ||
        !transaction.signature
      ) {
        this.logger.warn(`Invalid transaction received from peer ${peerId}`);
        return;
      }

      // Add to mempool
      await this.addTransaction(transaction);

      // Broadcast to other peers (handled by P2P service listening to this event)
      this.eventEmitter.emit('mempool.transaction.validated', transaction);
    } catch (error: any) {
      this.logger.error(
        `Error processing transaction from peer ${peerId}: ${error.message}`
      );
    }
  }

  // Periodic task to remove expired transactions
  @Cron(CronExpression.EVERY_MINUTE)
  async removeExpiredTransactions(): Promise<void> {
    const now = Date.now();
    const expirationTime: any = this.configService.get<number>(
      'mempool.expirationTime'
    );
    let expiredCount = 0;

    for (const [txId, tx] of this.pendingTransactions.entries()) {
      if (now - tx.addedAt > expirationTime) {
        if (this.removeTransaction(txId)) {
          expiredCount++;
        }
      }
    }

    if (expiredCount > 0) {
      this.logger.log(
        `Removed ${expiredCount} expired transactions from mempool`
      );
    }
  }

  // Handle block added event to remove included transactions
  @OnEvent('blockchain.block.added')
  handleBlockAdded(block: any): void {
    let removedCount = 0;

    // Remove transactions that were included in the block
    for (const tx of block.transactions) {
      if (this.removeTransaction(tx.id)) {
        removedCount++;
      }
    }

    this.logger.log(
      `Removed ${removedCount} transactions from mempool that were included in block ${block.hash}`
    );
  }

  // Get mempool statistics
  getStats(): any {
    const transactions = this.getAllTransactions();
    const totalFees = transactions.reduce(
      (sum, tx) => sum + BigInt(tx.fee),
      BigInt(0)
    );

    return {
      count: this.pendingTransactions.size,
      accountCount: this.transactionsByAccount.size,
      totalFees: totalFees.toString(),
      avgFee:
        transactions.length > 0
          ? (Number(totalFees) / transactions.length).toFixed(2)
          : '0',
      oldestTransaction:
        transactions.length > 0
          ? Math.min(...transactions.map((tx) => tx.addedAt))
          : null,
      byType: this.getTransactionCountByType(),
    };
  }

  // Helper to get transaction count by type
  private getTransactionCountByType(): Record<string, number> {
    const countByType: Record<string, number> = {};

    for (const tx of this.pendingTransactions.values()) {
      countByType[tx.type] = (countByType[tx.type] || 0) + 1;
    }

    return countByType;
  }
}
