// libs/core/voting/src/lib/types.ts

export enum ProposalStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
  PASSED = 'PASSED',
  REJECTED = 'REJECTED',
  EXECUTED = 'EXECUTED',
  CANCELLED = 'CANCELLED',
}

export enum VoteChoice {
  FOR = 'FOR',
  AGAINST = 'AGAINST',
  ABSTAIN = 'ABSTAIN',
}

export enum ProposalType {
  CONSTITUTIONAL = 'CONSTITUTIONAL', // Requires 75% approval
  LEGISLATIVE = 'LEGISLATIVE', // Requires 66% approval
  EXECUTIVE = 'EXECUTIVE', // Requires 60% approval
  BUDGET = 'BUDGET', // Requires 66% approval
  EMERGENCY = 'EMERGENCY', // Requires 50% approval
  LOCAL = 'LOCAL', // Requires 50% approval
}

export interface Proposal {
  id: string;
  type: ProposalType;
  title: string;
  description: string;
  creator: string;
  createdAt: number;
  startTime: number;
  endTime: number;
  status: ProposalStatus;
  requiredApproval: number; // Percentage required (0-100)
  minQuorum: number; // Minimum participation required
  executionData?: any; // Data to execute if passed
  metadata?: Record<string, any>;
}

export interface ProposalVote {
  proposalId: string;
  voter: string;
  choice: VoteChoice;
  votingPower: bigint;
  timestamp: number;
  reason?: string;
  signature: string;
}

export interface VotingResult {
  proposalId: string;
  totalVotes: bigint;
  forVotes: bigint;
  againstVotes: bigint;
  abstainVotes: bigint;
  uniqueVoters: number;
  passed: boolean;
  quorumMet: boolean;
  approvalPercentage: number;
}

export interface VotingRights {
  address: string;
  votingPower: bigint;
  delegatedTo?: string;
  delegatedFrom: string[];
  lastVoted?: number;
  lockedUntil?: number;
}

export interface VotingConfig {
  proposalDuration: {
    [key in ProposalType]: number; // Duration in seconds
  };
  requiredApproval: {
    [key in ProposalType]: number; // Percentage (0-100)
  };
  minQuorum: {
    [key in ProposalType]: number; // Percentage (0-100)
  };
  proposalCooldown: number; // Time between proposals by same creator
  executionDelay: number; // Delay after passing before execution
}

// Default configuration
export const DEFAULT_VOTING_CONFIG: VotingConfig = {
  proposalDuration: {
    [ProposalType.CONSTITUTIONAL]: 30 * 24 * 60 * 60, // 30 days
    [ProposalType.LEGISLATIVE]: 14 * 24 * 60 * 60, // 14 days
    [ProposalType.EXECUTIVE]: 7 * 24 * 60 * 60, // 7 days
    [ProposalType.BUDGET]: 21 * 24 * 60 * 60, // 21 days
    [ProposalType.EMERGENCY]: 24 * 60 * 60, // 24 hours
    [ProposalType.LOCAL]: 7 * 24 * 60 * 60, // 7 days
  },
  requiredApproval: {
    [ProposalType.CONSTITUTIONAL]: 75,
    [ProposalType.LEGISLATIVE]: 66,
    [ProposalType.EXECUTIVE]: 60,
    [ProposalType.BUDGET]: 66,
    [ProposalType.EMERGENCY]: 50,
    [ProposalType.LOCAL]: 50,
  },
  minQuorum: {
    [ProposalType.CONSTITUTIONAL]: 50,
    [ProposalType.LEGISLATIVE]: 33,
    [ProposalType.EXECUTIVE]: 25,
    [ProposalType.BUDGET]: 33,
    [ProposalType.EMERGENCY]: 10,
    [ProposalType.LOCAL]: 20,
  },
  proposalCooldown: 7 * 24 * 60 * 60, // 7 days
  executionDelay: 48 * 60 * 60, // 48 hours
};
