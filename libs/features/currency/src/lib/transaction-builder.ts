import { createHash } from 'crypto';
import {
  Transaction,
  TransactionType,
  ChuckramTransaction,
  TransactionOptions,
  TransactionSignature,
  TRANSACTION_FEES,
} from '@digital-chuckram/types';
import { CurrencyConverter } from './converter';

export class TransactionBuilder {
  private transaction: Partial<ChuckramTransaction>;
  private signatures: TransactionSignature[] = [];

  constructor() {
    this.transaction = {
      signatures: [],
      timestamp: Date.now(),
    };
  }

  /**
   * Set transaction type
   */
  setType(type: TransactionType): TransactionBuilder {
    this.transaction.type = type;
    this.transaction.fee = BigInt(
      TRANSACTION_FEES[type as keyof typeof TRANSACTION_FEES]
    );
    return this;
  }

  /**
   * Set sender address
   */
  setFrom(address: string): TransactionBuilder {
    this.transaction.from = address;
    return this;
  }

  /**
   * Set recipient address
   */
  setTo(address: string): TransactionBuilder {
    this.transaction.to = address;
    return this;
  }

  /**
   * Set transaction amount (in Cash)
   */
  setAmount(amount: bigint): TransactionBuilder {
    this.transaction.amount = amount;
    return this;
  }

  /**
   * Set transaction amount from string with unit
   */
  setAmountFromString(amountStr: string): TransactionBuilder {
    const amount = CurrencyConverter.parseAmount(amountStr);
    return this.setAmount(amount);
  }

  /**
   * Set transaction metadata
   */
  setMetadata(metadata: Record<string, any>): TransactionBuilder {
    this.transaction.metadata = metadata;
    return this;
  }

  /**
   * Set transaction nonce
   */
  setNonce(nonce: number): TransactionBuilder {
    this.transaction.nonce = nonce;
    return this;
  }

  /**
   * Calculate transaction hash
   */
  private calculateHash(): string {
    const data = {
      type: this.transaction.type,
      from: this.transaction.from,
      to: this.transaction.to,
      amount: this.transaction.amount?.toString(),
      fee: this.transaction.fee?.toString(),
      nonce: this.transaction.nonce,
      timestamp: this.transaction.timestamp,
      metadata: this.transaction.metadata,
    };

    const hash = createHash('sha256');
    hash.update(JSON.stringify(data));
    return hash.digest('hex');
  }

  /**
   * Add a signature to the transaction
   */
  addSignature(publicKey: string, signature: string): TransactionBuilder {
    this.signatures.push({
      publicKey,
      signature,
      timestamp: Date.now(),
    });
    return this;
  }

  /**
   * Validate transaction before building
   */
  private validate(): void {
    if (!this.transaction.type) {
      throw new Error('Transaction type is required');
    }

    if (!this.transaction.from) {
      throw new Error('From address is required');
    }

    if (!this.transaction.to) {
      throw new Error('To address is required');
    }

    if (this.transaction.amount === undefined) {
      throw new Error('Amount is required');
    }

    if (this.transaction.amount < 0n) {
      throw new Error('Amount must be non-negative');
    }

    // For transfers, ensure amount covers fee
    if (this.transaction.type === TransactionType.TRANSFER) {
      if (this.transaction.amount === 0n) {
        throw new Error('Transfer amount must be greater than 0');
      }
    }

    // For votes, ensure metadata contains proposal ID
    if (this.transaction.type === TransactionType.VOTE) {
      if (!this.transaction.metadata?.proposalId) {
        throw new Error('Vote transaction requires proposalId in metadata');
      }
    }
  }

  /**
   * Build the final transaction
   */
  build(): ChuckramTransaction {
    this.validate();

    // Add default nonce if not set
    if (this.transaction.nonce === undefined) {
      this.transaction.nonce = Math.floor(Math.random() * 1000000);
    }

    // Calculate hash
    this.transaction.hash = this.calculateHash();

    // Add signatures
    this.transaction.signatures = this.signatures;

    return this.transaction as ChuckramTransaction;
  }

  /**
   * Create a simple transfer transaction
   */
  static createTransfer(
    from: string,
    to: string,
    amount: bigint | string,
    nonce?: number
  ): TransactionBuilder {
    const builder = new TransactionBuilder();

    builder.setType(TransactionType.TRANSFER).setFrom(from).setTo(to);

    if (typeof amount === 'string') {
      builder.setAmountFromString(amount);
    } else {
      builder.setAmount(amount);
    }

    if (nonce !== undefined) {
      builder.setNonce(nonce);
    }

    return builder;
  }

  /**
   * Create a vote transaction
   */
  static createVote(
    from: string,
    proposalId: string,
    vote: boolean,
    nonce?: number
  ): TransactionBuilder {
    const builder = new TransactionBuilder();

    builder
      .setType(TransactionType.VOTE)
      .setFrom(from)
      .setTo('0x0') // System address for votes
      .setAmount(0n)
      .setMetadata({
        proposalId,
        vote,
        timestamp: Date.now(),
      });

    if (nonce !== undefined) {
      builder.setNonce(nonce);
    }

    return builder;
  }

  /**
   * Create a reward transaction
   */
  static createReward(
    to: string,
    amount: bigint | string,
    reason: string,
    nonce?: number
  ): TransactionBuilder {
    const builder = new TransactionBuilder();

    builder
      .setType(TransactionType.REWARD)
      .setFrom('0x0') // System address for rewards
      .setTo(to)
      .setMetadata({
        reason,
        timestamp: Date.now(),
      });

    if (typeof amount === 'string') {
      builder.setAmountFromString(amount);
    } else {
      builder.setAmount(amount);
    }

    if (nonce !== undefined) {
      builder.setNonce(nonce);
    }

    return builder;
  }

  /**
   * Verify if account can afford transaction including fees
   */
  static canAfford(
    balance: bigint,
    amount: bigint,
    type: TransactionType
  ): boolean {
    const fee = BigInt(TRANSACTION_FEES[type as keyof typeof TRANSACTION_FEES]);
    return balance >= amount + fee;
  }

  /**
   * Calculate total cost of transaction (amount + fee)
   */
  static getTotalCost(amount: bigint, type: TransactionType): bigint {
    const fee = BigInt(TRANSACTION_FEES[type as keyof typeof TRANSACTION_FEES]);
    return amount + fee;
  }
}
