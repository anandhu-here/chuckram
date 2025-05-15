import { TransactionBuilder } from './transaction-builder';
import { TransactionType, TRANSACTION_FEES } from '@digital-chuckram/types';

describe('TransactionBuilder', () => {
  describe('building transactions', () => {
    it('should build a basic transfer transaction', () => {
      const tx = new TransactionBuilder()
        .setType(TransactionType.TRANSFER)
        .setFrom('address1')
        .setTo('address2')
        .setAmount(1000n)
        .setNonce(123)
        .build();

      expect(tx.type).toBe(TransactionType.TRANSFER);
      expect(tx.from).toBe('address1');
      expect(tx.to).toBe('address2');
      expect(tx.amount).toBe(1000n);
      expect(tx.fee).toBe(BigInt(TRANSACTION_FEES.TRANSFER));
      expect(tx.nonce).toBe(123);
      expect(tx.hash).toBeDefined();
      expect(tx.timestamp).toBeDefined();
    });

    it('should add signatures to transaction', () => {
      const builder = new TransactionBuilder()
        .setType(TransactionType.TRANSFER)
        .setFrom('address1')
        .setTo('address2')
        .setAmount(1000n);

      builder.addSignature('pubkey1', 'sig1');
      builder.addSignature('pubkey2', 'sig2');

      const tx = builder.build();

      expect(tx.signatures).toHaveLength(2);
      expect(tx.signatures[0]).toEqual({
        publicKey: 'pubkey1',
        signature: 'sig1',
        timestamp: expect.any(Number),
      });
    });

    it('should set metadata', () => {
      const metadata = { note: 'Test payment', category: 'services' };
      const tx = new TransactionBuilder()
        .setType(TransactionType.TRANSFER)
        .setFrom('address1')
        .setTo('address2')
        .setAmount(1000n)
        .setMetadata(metadata)
        .build();

      expect(tx.metadata).toEqual(metadata);
    });

    it('should generate random nonce if not provided', () => {
      const tx = new TransactionBuilder()
        .setType(TransactionType.TRANSFER)
        .setFrom('address1')
        .setTo('address2')
        .setAmount(1000n)
        .build();

      expect(tx.nonce).toBeDefined();
      expect(tx.nonce).toBeGreaterThanOrEqual(0);
      expect(tx.nonce).toBeLessThan(1000000);
    });
  });

  describe('validation', () => {
    it('should throw if type is missing', () => {
      const builder = new TransactionBuilder()
        .setFrom('address1')
        .setTo('address2')
        .setAmount(1000n);

      expect(() => builder.build()).toThrow('Transaction type is required');
    });

    it('should throw if from address is missing', () => {
      const builder = new TransactionBuilder()
        .setType(TransactionType.TRANSFER)
        .setTo('address2')
        .setAmount(1000n);

      expect(() => builder.build()).toThrow('From address is required');
    });

    it('should throw if to address is missing', () => {
      const builder = new TransactionBuilder()
        .setType(TransactionType.TRANSFER)
        .setFrom('address1')
        .setAmount(1000n);

      expect(() => builder.build()).toThrow('To address is required');
    });

    it('should throw if amount is missing', () => {
      const builder = new TransactionBuilder()
        .setType(TransactionType.TRANSFER)
        .setFrom('address1')
        .setTo('address2');

      expect(() => builder.build()).toThrow('Amount is required');
    });

    it('should throw if amount is negative', () => {
      const builder = new TransactionBuilder()
        .setType(TransactionType.TRANSFER)
        .setFrom('address1')
        .setTo('address2')
        .setAmount(-100n);

      expect(() => builder.build()).toThrow('Amount must be non-negative');
    });

    it('should throw if transfer amount is zero', () => {
      const builder = new TransactionBuilder()
        .setType(TransactionType.TRANSFER)
        .setFrom('address1')
        .setTo('address2')
        .setAmount(0n);

      expect(() => builder.build()).toThrow(
        'Transfer amount must be greater than 0'
      );
    });

    it('should require proposalId for vote transactions', () => {
      const builder = new TransactionBuilder()
        .setType(TransactionType.VOTE)
        .setFrom('address1')
        .setTo('0x0')
        .setAmount(0n);

      expect(() => builder.build()).toThrow(
        'Vote transaction requires proposalId in metadata'
      );
    });

    it('should accept vote transaction with proposalId', () => {
      const tx = new TransactionBuilder()
        .setType(TransactionType.VOTE)
        .setFrom('address1')
        .setTo('0x0')
        .setAmount(0n)
        .setMetadata({ proposalId: 'prop-123', vote: true })
        .build();

      expect(tx.type).toBe(TransactionType.VOTE);
      expect(tx.metadata?.proposalId).toBe('prop-123');
    });
  });

  describe('amount setting', () => {
    it('should set amount from bigint', () => {
      const tx = new TransactionBuilder()
        .setType(TransactionType.TRANSFER)
        .setFrom('address1')
        .setTo('address2')
        .setAmount(12345n)
        .build();

      expect(tx.amount).toBe(12345n);
    });

    it('should set amount from string with unit', () => {
      const tx = new TransactionBuilder()
        .setType(TransactionType.TRANSFER)
        .setFrom('address1')
        .setTo('address2')
        .setAmountFromString('100 ₹C')
        .build();

      expect(tx.amount).toBe(1600n); // 100 * 16 cash
    });

    it('should handle different unit strings', () => {
      const tx1 = new TransactionBuilder()
        .setType(TransactionType.TRANSFER)
        .setFrom('address1')
        .setTo('address2')
        .setAmountFromString('5 F')
        .build();

      expect(tx1.amount).toBe(320n); // 5 * 64 cash

      const tx2 = new TransactionBuilder()
        .setType(TransactionType.TRANSFER)
        .setFrom('address1')
        .setTo('address2')
        .setAmountFromString('1 Cr')
        .build();

      expect(tx2.amount).toBe(160000000n); // 1 crore in cash
    });
  });

  describe('static factory methods', () => {
    describe('createTransfer', () => {
      it('should create transfer transaction with bigint amount', () => {
        const builder = TransactionBuilder.createTransfer(
          'from',
          'to',
          1000n,
          456
        );
        const tx = builder.build();

        expect(tx.type).toBe(TransactionType.TRANSFER);
        expect(tx.from).toBe('from');
        expect(tx.to).toBe('to');
        expect(tx.amount).toBe(1000n);
        expect(tx.nonce).toBe(456);
      });

      it('should create transfer transaction with string amount', () => {
        const builder = TransactionBuilder.createTransfer(
          'from',
          'to',
          '50 ₹C'
        );
        const tx = builder.build();

        expect(tx.type).toBe(TransactionType.TRANSFER);
        expect(tx.amount).toBe(800n); // 50 * 16
      });
    });

    describe('createVote', () => {
      it('should create vote transaction', () => {
        const builder = TransactionBuilder.createVote(
          'voter',
          'prop-123',
          true,
          789
        );
        const tx = builder.build();

        expect(tx.type).toBe(TransactionType.VOTE);
        expect(tx.from).toBe('voter');
        expect(tx.to).toBe('0x0');
        expect(tx.amount).toBe(0n);
        expect(tx.fee).toBe(0n); // Votes are free
        expect(tx.metadata).toEqual({
          proposalId: 'prop-123',
          vote: true,
          timestamp: expect.any(Number),
        });
        expect(tx.nonce).toBe(789);
      });
    });

    describe('createReward', () => {
      it('should create reward transaction with bigint amount', () => {
        const builder = TransactionBuilder.createReward(
          'recipient',
          5000n,
          'Good citizenship',
          321
        );
        const tx = builder.build();

        expect(tx.type).toBe(TransactionType.REWARD);
        expect(tx.from).toBe('0x0'); // System address
        expect(tx.to).toBe('recipient');
        expect(tx.amount).toBe(5000n);
        expect(tx.fee).toBe(0n); // Rewards are free
        expect(tx.metadata).toEqual({
          reason: 'Good citizenship',
          timestamp: expect.any(Number),
        });
        expect(tx.nonce).toBe(321);
      });

      it('should create reward transaction with string amount', () => {
        const builder = TransactionBuilder.createReward(
          'recipient',
          '100 ₹C',
          'Festival bonus'
        );
        const tx = builder.build();

        expect(tx.amount).toBe(1600n); // 100 * 16
      });
    });
  });

  describe('utility methods', () => {
    it('should check if account can afford transaction', () => {
      const balance = 2000n;

      // Transfer costs amount + fee (16 cash)
      expect(
        TransactionBuilder.canAfford(balance, 1984n, TransactionType.TRANSFER)
      ).toBe(true);
      expect(
        TransactionBuilder.canAfford(balance, 1985n, TransactionType.TRANSFER)
      ).toBe(false);

      // Vote is free
      expect(
        TransactionBuilder.canAfford(balance, 0n, TransactionType.VOTE)
      ).toBe(true);

      // Reward is free
      expect(
        TransactionBuilder.canAfford(balance, 0n, TransactionType.REWARD)
      ).toBe(true);
    });

    it('should calculate total cost of transaction', () => {
      const amount = 1000n;

      expect(
        TransactionBuilder.getTotalCost(amount, TransactionType.TRANSFER)
      ).toBe(1016n); // +16 fee
      expect(
        TransactionBuilder.getTotalCost(amount, TransactionType.VOTE)
      ).toBe(1000n); // no fee
      expect(
        TransactionBuilder.getTotalCost(amount, TransactionType.REWARD)
      ).toBe(1000n); // no fee
      expect(
        TransactionBuilder.getTotalCost(amount, TransactionType.MINT)
      ).toBe(1160n); // +160 fee
    });
  });

  describe('hash calculation', () => {
    it('should generate deterministic hash for same data', () => {
      const builder1 = new TransactionBuilder()
        .setType(TransactionType.TRANSFER)
        .setFrom('address1')
        .setTo('address2')
        .setAmount(1000n)
        .setNonce(123);

      const builder2 = new TransactionBuilder()
        .setType(TransactionType.TRANSFER)
        .setFrom('address1')
        .setTo('address2')
        .setAmount(1000n)
        .setNonce(123);

      // Set same timestamp for deterministic test
      builder1['transaction'].timestamp = 1000000;
      builder2['transaction'].timestamp = 1000000;

      const tx1 = builder1.build();
      const tx2 = builder2.build();

      expect(tx1.hash).toBe(tx2.hash);
    });

    it('should generate different hash for different data', () => {
      const tx1 = new TransactionBuilder()
        .setType(TransactionType.TRANSFER)
        .setFrom('address1')
        .setTo('address2')
        .setAmount(1000n)
        .setNonce(123)
        .build();

      const tx2 = new TransactionBuilder()
        .setType(TransactionType.TRANSFER)
        .setFrom('address1')
        .setTo('address2')
        .setAmount(1001n) // Different amount
        .setNonce(123)
        .build();

      expect(tx1.hash).not.toBe(tx2.hash);
    });
  });
});
