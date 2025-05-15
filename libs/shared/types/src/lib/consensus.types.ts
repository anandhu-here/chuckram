export interface Validator {
  address: string;
  type: 'GOVERNMENT' | 'CITIZEN';
  stake?: bigint;
  votingPower: number;
  active: boolean;
  lastActiveBlock: number;
  registeredAt: number;
}

export interface ConsensusConfig {
  minValidators: number;
  maxValidators: number;
  blockTime: number; // in milliseconds
  governmentValidatorRatio: number; // 0.5 for 50%
  citizenValidatorRatio: number; // 0.5 for 50%
  requiredConsensus: number; // 0.66 for 66%
  validatorRotationInterval: number; // in blocks
}

export interface ConsensusState {
  currentValidators: Map<string, Validator>;
  pendingValidators: Map<string, Validator>;
  lastRotationBlock: number;
  currentProposer: string;
  round: number;
}

export interface Vote {
  validatorAddress: string;
  blockHash: string;
  blockHeight: number;
  signature: string;
  timestamp: number;
}

export interface ConsensusMessage {
  type: 'PROPOSE' | 'VOTE' | 'COMMIT';
  data: any;
  from: string;
  signature: string;
  timestamp: number;
}
