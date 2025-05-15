import { Transaction, TransactionType } from '@digital-chuckram/types';

// Currency denomination constants
export const CASH_PER_CHUCKRAM = 16;
export const CHUCKRAMS_PER_FANAM = 4;
export const FANAMS_PER_VARAHA = 16;
export const CHUCKRAMS_PER_LAKH = 100000;
export const CHUCKRAMS_PER_CRORE = 10000000;

// Transaction types
// (Removed local TransactionType enum, using imported one)

// Transaction fees in Cash
export const TRANSACTION_FEES = {
  [TransactionType.TRANSFER]: 16, // 1 Chuckram
  [TransactionType.VOTE]: 0, // Free
  [TransactionType.REWARD]: 0, // Free (system initiated)
  [TransactionType.FEE]: 0, // Meta fee transaction
  [TransactionType.MINT]: 160, // 10 Chuckrams (privileged operation)
  [TransactionType.BURN]: 160, // 10 Chuckrams
};

// Currency denomination interface
export interface ChuckramDenomination {
  crores: bigint;
  lakhs: bigint;
  varahas: bigint;
  fanams: bigint;
  chuckrams: bigint;
  cash: bigint;
}

// Extended transaction with additional metadata
export interface ChuckramTransaction extends Transaction {
  type: TransactionType;
  fee: bigint;
  metadata?: Record<string, any>;
  signatures: TransactionSignature[];
  hash?: string;
}

// Multi-signature support
export interface TransactionSignature {
  publicKey: string;
  signature: string;
  timestamp: number;
}

// Transaction builder options
export interface TransactionOptions {
  type: TransactionType;
  from: string;
  to: string;
  amount: bigint;
  metadata?: Record<string, any>;
  nonce?: number;
  requiredSignatures?: number;
}

// Currency conversion result
export interface ConversionResult {
  amount: bigint;
  denomination: ChuckramDenomination;
  formatted: string;
}
