import { Blockchain } from './blockchain';
import { Transaction, TransactionType } from '@digital-chuckram/types';

describe('Blockchain', () => {
  let blockchain: Blockchain;

  beforeEach(() => {
    blockchain = new Blockchain();
  });

  it('should create genesis block', () => {
    const chain = blockchain.getChain();
    expect(chain.length).toBe(1);
    expect(chain[0].header.height).toBe(0);
    expect(chain[0].header.previousHash).toBe('0');
  });

  it('should add a valid transaction to mempool', () => {
    const tx: Transaction = {
      id: '1',
      from: 'SYSTEM',
      to: 'CHKuser123',
      amount: 100n,
      fee: 0n,
      timestamp: Date.now(),
      type: TransactionType.REWARD,
      signature: '',
      nonce: 0,
    };

    const result = blockchain.addTransaction(tx);
    expect(result).toBe(true);
  });

  it('should create a new block', () => {
    const tx: Transaction = {
      id: '1',
      from: 'SYSTEM',
      to: 'CHKuser123',
      amount: 100n,
      fee: 0n,
      timestamp: Date.now(),
      type: TransactionType.REWARD,
      signature: '',
      nonce: 0,
    };

    blockchain.addTransaction(tx);
    const block = blockchain.createBlock('CHKvalidator1');

    expect(block).toBeDefined();
    expect(block?.transactions.length).toBe(1);
    expect(block?.header.height).toBe(1);
  });

  it('should update balances after adding block', () => {
    const tx: Transaction = {
      id: '1',
      from: 'SYSTEM',
      to: 'CHKuser123',
      amount: 100n,
      fee: 0n,
      timestamp: Date.now(),
      type: TransactionType.REWARD,
      signature: '',
      nonce: 0,
    };

    blockchain.addTransaction(tx);
    const block = blockchain.createBlock('CHKvalidator1');
    blockchain.addBlock(block!);

    const balance = blockchain.getBalance('CHKuser123');
    expect(balance).toBe(100n);
  });
});
