export interface BlockHeader {
  version: number;
  previousHash: string;
  merkleRoot: string;
  timestamp: number;
  height: number;
  validatorAddress: string;
  validatorSignature?: string;
}

export interface Block {
  header: BlockHeader;
  transactions: Transaction[];
  hash: string;
  nonce: number;
}

export interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: bigint;
  fee: bigint;
  timestamp: number;
  type: TransactionType;
  data?: any;
  signature: string;
  nonce: number;
}

export enum TransactionType {
  TRANSFER = 'TRANSFER',
  VOTE = 'VOTE',
  PROPOSAL = 'PROPOSAL',
  VALIDATOR_REGISTRATION = 'VALIDATOR_REGISTRATION',
  IDENTITY_REGISTRATION = 'IDENTITY_REGISTRATION',
  REWARD = 'REWARD',
  FEE = 'FEE',
  MINT = 'MINT',
  BURN = 'BURN',
}

// export interface ChuckramDenomination {
//   cash: 1;
//   chuckram: 16;
//   fanam: 64;
//   varaha: 256;
//   lakh: 1_600_000;
//   crore: 160_000_000;
// }

export interface ValidatorNode {
  address: string;
  type: 'GOVERNMENT' | 'CITIZEN';
  stake?: bigint;
  active: boolean;
  registeredAt: number;
  lastActiveBlock: number;
}

export interface ChainState {
  height: number;
  lastBlockHash: string;
  validators: Map<string, ValidatorNode>;
  balances: Map<string, bigint>;
  votingPower: Map<string, number>;
}
