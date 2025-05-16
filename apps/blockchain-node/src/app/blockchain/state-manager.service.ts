// apps/blockchain-node/src/app/blockchain/state-manager.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class StateManager {
  private readonly logger = new Logger(StateManager.name);
  private balances: Map<string, bigint> = new Map();
  private validators: Map<string, any> = new Map();
  private nonces: Map<string, number> = new Map();
  private chainHeight: number = 0;
  private lastBlockHash: string | undefined;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  // Initialize state with genesis block
  async initialize(genesisBlock: any): Promise<void> {
    this.logger.log('Initializing blockchain state from genesis block');

    // Reset state
    this.balances.clear();
    this.validators.clear();
    this.nonces.clear();

    // Apply genesis transactions
    for (const tx of genesisBlock.transactions) {
      await this.applyTransaction(tx);
    }

    // Update chain state
    this.chainHeight = 0;
    this.lastBlockHash = genesisBlock.hash;

    this.logger.log('State initialized successfully');
  }

  // Apply block to update state
  async applyBlock(block: any): Promise<void> {
    this.logger.debug(
      `Applying block ${block.hash} at height ${block.header.height} to state`
    );

    try {
      // Apply each transaction in the block
      for (const tx of block.transactions) {
        await this.applyTransaction(tx);
      }

      // Update chain state
      this.chainHeight = block.header.height;
      this.lastBlockHash = block.hash;

      // Emit state updated event
      this.eventEmitter.emit('blockchain.state.updated', {
        height: this.chainHeight,
        lastBlockHash: this.lastBlockHash,
        balanceUpdates: block.transactions.length, // For tracking purposes
      });

      this.logger.debug(`Block ${block.hash} successfully applied to state`);
    } catch (error: any) {
      this.logger.error(
        `Error applying block ${block.hash} to state: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  // Apply transaction to update state
  private async applyTransaction(tx: any): Promise<void> {
    // Handle different transaction types
    switch (tx.type) {
      case 'TRANSFER':
        await this.applyTransferTransaction(tx);
        break;
      case 'MINT':
        await this.applyMintTransaction(tx);
        break;
      case 'BURN':
        await this.applyBurnTransaction(tx);
        break;
      case 'VALIDATOR_REGISTRATION':
        await this.applyValidatorRegistration(tx);
        break;
      case 'REWARD':
        await this.applyRewardTransaction(tx);
        break;
      // Add more transaction types as needed
      default:
        throw new Error(`Unsupported transaction type: ${tx.type}`);
    }

    // Update nonce for sender (except for system transactions)
    if (tx.from !== '0'.repeat(40)) {
      const currentNonce = this.nonces.get(tx.from) || 0;
      this.nonces.set(tx.from, Math.max(currentNonce, tx.nonce + 1));
    }
  }

  // Apply transfer transaction
  private async applyTransferTransaction(tx: any): Promise<void> {
    const { from, to, amount, fee } = tx;

    // Convert strings to BigInt
    const amountValue = BigInt(amount);
    const feeValue = BigInt(fee);
    const totalDebit = amountValue + feeValue;

    // Check if sender has enough balance
    const senderBalance = this.getBalance(from);
    if (senderBalance < totalDebit) {
      throw new Error(
        `Insufficient balance: ${from} has ${senderBalance}, needs ${totalDebit}`
      );
    }

    // Update sender balance
    this.setBalance(from, senderBalance - totalDebit);

    // Update recipient balance
    const recipientBalance = this.getBalance(to);
    this.setBalance(to, recipientBalance + amountValue);

    // Fee goes to system (in a real implementation, would go to validators)
    if (feeValue > 0n) {
      const systemAddress = '0'.repeat(40); // System fee collection address
      const systemBalance = this.getBalance(systemAddress);
      this.setBalance(systemAddress, systemBalance + feeValue);
    }
  }

  // Apply mint transaction
  private async applyMintTransaction(tx: any): Promise<void> {
    const { to, amount } = tx;

    // Convert string to BigInt
    const amountValue = BigInt(amount);

    // Update recipient balance
    const recipientBalance = this.getBalance(to);
    this.setBalance(to, recipientBalance + amountValue);
  }

  // Apply burn transaction
  private async applyBurnTransaction(tx: any): Promise<void> {
    const { from, amount, fee } = tx;

    // Convert strings to BigInt
    const amountValue = BigInt(amount);
    const feeValue = BigInt(fee);
    const totalDebit = amountValue + feeValue;

    // Check if sender has enough balance
    const senderBalance = this.getBalance(from);
    if (senderBalance < totalDebit) {
      throw new Error(
        `Insufficient balance: ${from} has ${senderBalance}, needs ${totalDebit}`
      );
    }

    // Update sender balance (burn amount + fee)
    this.setBalance(from, senderBalance - totalDebit);

    // Fee goes to system
    if (feeValue > 0n) {
      const systemAddress = '0'.repeat(40);
      const systemBalance = this.getBalance(systemAddress);
      this.setBalance(systemAddress, systemBalance + feeValue);
    }

    // Burned amount is removed from circulation (no recipient)
  }

  // Apply validator registration
  private async applyValidatorRegistration(tx: any): Promise<void> {
    const { from, data, fee } = tx;

    // Convert string to BigInt
    const feeValue = BigInt(fee);

    // Extract validator data
    const { validatorType, stake } = data;

    // Check if sender has enough balance for fee + stake
    const stakeValue = stake ? BigInt(stake) : 0n;
    const totalDebit = feeValue + stakeValue;

    const senderBalance = this.getBalance(from);
    if (senderBalance < totalDebit) {
      throw new Error(
        `Insufficient balance: ${from} has ${senderBalance}, needs ${totalDebit}`
      );
    }

    // Deduct fee and stake
    this.setBalance(from, senderBalance - totalDebit);

    // Fee goes to system
    if (feeValue > 0n) {
      const systemAddress = '0'.repeat(40);
      const systemBalance = this.getBalance(systemAddress);
      this.setBalance(systemAddress, systemBalance + feeValue);
    }

    // Register validator
    this.validators.set(from, {
      address: from,
      type: validatorType,
      stake: stakeValue.toString(),
      registeredAt: tx.timestamp,
      active: true,
      lastActiveBlock: this.chainHeight,
    });

    // Emit validator registered event
    this.eventEmitter.emit('validator.registered', {
      validatorAddress: from,
      validatorType,
      stake: stakeValue.toString(),
    });
  }

  // Apply reward transaction
  private async applyRewardTransaction(tx: any): Promise<void> {
    const { to, amount } = tx;

    // Convert string to BigInt
    const amountValue = BigInt(amount);

    // Update recipient balance
    const recipientBalance = this.getBalance(to);
    this.setBalance(to, recipientBalance + amountValue);
  }

  // Get balance for an address
  getBalance(address: string): bigint {
    return this.balances.get(address) || 0n;
  }

  // Set balance for an address
  setBalance(address: string, balance: bigint): void {
    this.balances.set(address, balance);
  }

  // Get nonce for an address
  getNonce(address: string): number {
    return this.nonces.get(address) || 0;
  }

  // Get validator info
  getValidator(address: string): any {
    return this.validators.get(address);
  }

  // Get all validators
  getValidators(): any[] {
    return Array.from(this.validators.values());
  }

  // Get active validators
  getActiveValidators(): any[] {
    return this.getValidators().filter((v) => v.active);
  }

  // Get validators by type
  getValidatorsByType(type: string): any[] {
    return this.getValidators().filter((v) => v.type === type);
  }

  // Get address top balances
  getTopBalances(
    limit: number = 100
  ): Array<{ address: string; balance: string }> {
    const entries = Array.from(this.balances.entries())
      .map(([address, balance]) => ({ address, balance: balance.toString() }))
      .sort((a, b) => (BigInt(b.balance) > BigInt(a.balance) ? 1 : -1));

    return entries.slice(0, limit);
  }

  // Get total supply (sum of all balances)
  getTotalSupply(): bigint {
    let total = 0n;
    for (const balance of this.balances.values()) {
      total += balance;
    }
    return total;
  }

  // Get state information
  getStateInfo(): any {
    return {
      height: this.chainHeight,
      lastBlockHash: this.lastBlockHash,
      accountCount: this.balances.size,
      validatorCount: this.validators.size,
      activeValidatorCount: this.getActiveValidators().length,
      totalSupply: this.getTotalSupply().toString(),
    };
  }

  // Check if a transaction is valid based on current state
  validateTransaction(tx: any): boolean {
    try {
      // Check nonce
      if (tx.from !== '0'.repeat(40)) {
        // Skip for system transactions
        const currentNonce = this.getNonce(tx.from);
        if (tx.nonce < currentNonce) {
          this.logger.debug(
            `Transaction ${tx.id} has invalid nonce ${tx.nonce}, current is ${currentNonce}`
          );
          return false;
        }
      }

      // Check balance for transactions that require funds
      if (['TRANSFER', 'BURN', 'VALIDATOR_REGISTRATION'].includes(tx.type)) {
        const amount = BigInt(tx.amount || '0');
        const fee = BigInt(tx.fee);
        const stake =
          tx.type === 'VALIDATOR_REGISTRATION' && tx.data?.stake
            ? BigInt(tx.data.stake)
            : 0n;

        const totalNeeded = amount + fee + stake;
        const balance = this.getBalance(tx.from);

        if (balance < totalNeeded) {
          this.logger.debug(
            `Transaction ${tx.id} requires ${totalNeeded} but account ${tx.from} only has ${balance}`
          );
          return false;
        }
      }

      // Additional validation could be added here for specific transaction types

      return true;
    } catch (error: any) {
      this.logger.error(
        `Error validating transaction ${tx.id}: ${error.message}`
      );
      return false;
    }
  }
}
