import { Block, Transaction, ChainState } from '@digital-chuckram/types';
import { CryptoUtils } from '@digital-chuckram/crypto';
import { serializeBigInt } from '@digital-chuckram/utils';

export class Blockchain {
  private chain: Block[] = [];
  private state: ChainState;
  private mempool: Transaction[] = [];

  constructor() {
    this.state = {
      height: 0,
      lastBlockHash: '0',
      validators: new Map(),
      balances: new Map(),
      votingPower: new Map(),
    };

    this.createGenesisBlock();
  }

  private createGenesisBlock(): void {
    const genesisBlock: Block = {
      header: {
        version: 1,
        previousHash: '0',
        merkleRoot: '0',
        timestamp: Date.now(),
        height: 0,
        validatorAddress: 'GENESIS',
      },
      transactions: [],
      hash: '0',
      nonce: 0,
    };

    genesisBlock.hash = this.calculateBlockHash(genesisBlock);
    this.chain.push(genesisBlock);
    this.state.height = 0;
    this.state.lastBlockHash = genesisBlock.hash;
  }

  calculateBlockHash(block: Block): string {
    const headerString = serializeBigInt(block.header);
    const txString = serializeBigInt(block.transactions);
    return CryptoUtils.doubleHash(headerString + txString + block.nonce);
  }
  addTransaction(transaction: Transaction): boolean {
    // Validate transaction
    if (!this.validateTransaction(transaction)) {
      return false;
    }

    this.mempool.push(transaction);
    return true;
  }

  private validateTransaction(transaction: Transaction): boolean {
    // Check signature
    const txData = serializeBigInt({
      from: transaction.from,
      to: transaction.to,
      amount: transaction.amount,
      fee: transaction.fee,
      timestamp: transaction.timestamp,
      type: transaction.type,
      data: transaction.data,
      nonce: transaction.nonce,
    });

    // For genesis or reward transactions, skip signature validation
    if (transaction.from === 'SYSTEM') {
      return true;
    }

    // Validate signature (implement after we have identity service)
    // For now, basic validation
    if (!transaction.signature) {
      return false;
    }

    // Check balance
    const senderBalance = this.state.balances.get(transaction.from) || 0n;
    const totalAmount = transaction.amount + transaction.fee;

    if (senderBalance < totalAmount) {
      return false;
    }

    return true;
  }

  createBlock(validatorAddress: string): Block | null {
    if (this.mempool.length === 0) {
      return null;
    }

    const transactions = [...this.mempool];
    this.mempool = [];

    const previousBlock = this.chain[this.chain.length - 1];

    const newBlock: Block = {
      header: {
        version: 1,
        previousHash: previousBlock.hash,
        merkleRoot: this.calculateMerkleRoot(transactions),
        timestamp: Date.now(),
        height: previousBlock.header.height + 1,
        validatorAddress: validatorAddress,
      },
      transactions: transactions,
      hash: '',
      nonce: 0,
    };

    // Mine block (PoA - just sign it)
    newBlock.hash = this.calculateBlockHash(newBlock);

    return newBlock;
  }

  private calculateMerkleRoot(transactions: Transaction[]): string {
    if (transactions.length === 0) return '';

    const hashes = transactions.map((tx) =>
      CryptoUtils.hash(serializeBigInt(tx))
    );

    return CryptoUtils.generateMerkleRoot(hashes);
  }

  addBlock(block: Block): boolean {
    if (!this.validateBlock(block)) {
      return false;
    }

    this.chain.push(block);
    this.updateState(block);

    return true;
  }

  private validateBlock(block: Block): boolean {
    const previousBlock = this.chain[this.chain.length - 1];

    // Check previous hash
    if (block.header.previousHash !== previousBlock.hash) {
      return false;
    }

    // Check height
    if (block.header.height !== previousBlock.header.height + 1) {
      return false;
    }

    // Check block hash
    const calculatedHash = this.calculateBlockHash(block);
    if (calculatedHash !== block.hash) {
      return false;
    }

    // Validate all transactions
    for (const tx of block.transactions) {
      if (!this.validateTransaction(tx)) {
        return false;
      }
    }

    // Validate merkle root
    const calculatedMerkleRoot = this.calculateMerkleRoot(block.transactions);
    if (calculatedMerkleRoot !== block.header.merkleRoot) {
      return false;
    }

    return true;
  }

  private updateState(block: Block): void {
    this.state.height = block.header.height;
    this.state.lastBlockHash = block.hash;

    // Process transactions
    for (const tx of block.transactions) {
      this.processTransaction(tx);
    }
  }

  private processTransaction(tx: Transaction): void {
    // Update balances
    if (tx.from !== 'SYSTEM') {
      const fromBalance = this.state.balances.get(tx.from) || 0n;
      this.state.balances.set(tx.from, fromBalance - tx.amount - tx.fee);
    }

    const toBalance = this.state.balances.get(tx.to) || 0n;
    this.state.balances.set(tx.to, toBalance + tx.amount);

    // Process fee (goes to validator)
    if (tx.fee > 0n) {
      const validatorBalance = this.state.balances.get(tx.from) || 0n;
      this.state.balances.set(tx.from, validatorBalance + tx.fee);
    }
  }

  getBalance(address: string): bigint {
    return this.state.balances.get(address) || 0n;
  }

  getChain(): Block[] {
    return [...this.chain];
  }

  getLatestBlock(): Block {
    return this.chain[this.chain.length - 1];
  }

  getState(): ChainState {
    return this.state;
  }
}
