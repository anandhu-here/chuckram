import { Block, Transaction } from '@digital-chuckram/types';
import { CryptoUtils } from '@digital-chuckram/crypto';
import {
  Validator,
  ConsensusConfig,
  ConsensusState,
  Vote,
  ConsensusMessage,
} from '@digital-chuckram/types';

export class ConsensusEngine {
  private config: ConsensusConfig;
  private state: ConsensusState;
  private votes: Map<string, Vote[]> = new Map();
  private onBlockFinalized?: (block: Block) => void;

  constructor(config: ConsensusConfig) {
    this.config = config;
    this.state = {
      currentValidators: new Map(),
      pendingValidators: new Map(),
      lastRotationBlock: 0,
      currentProposer: '',
      round: 0,
    };
  }

  // Add a validator to the network
  async addValidator(validator: Validator): Promise<boolean> {
    // Check validator limits
    const currentValidators = this.state.currentValidators.size;
    const pendingValidators = this.state.pendingValidators.size;
    const totalValidators = currentValidators + pendingValidators;

    if (totalValidators >= this.config.maxValidators) {
      return false;
    }

    // Count validators by type (current + pending)
    let govCount = 0;
    let citizenCount = 0;

    // Count current validators
    this.state.currentValidators.forEach((v) => {
      if (v.type === 'GOVERNMENT') govCount++;
      else citizenCount++;
    });

    // Count pending validators
    this.state.pendingValidators.forEach((v) => {
      if (v.type === 'GOVERNMENT') govCount++;
      else citizenCount++;
    });

    // Add the new validator to the count
    if (validator.type === 'GOVERNMENT') {
      govCount++;
    } else {
      citizenCount++;
    }

    const total = govCount + citizenCount;
    const govRatio = govCount / total;
    const citizenRatio = citizenCount / total;

    // Check if adding this validator would violate the ratio
    // Allow up to 10% deviation from the target ratio
    const maxGovRatio = this.config.governmentValidatorRatio + 0.1;
    const maxCitizenRatio = this.config.citizenValidatorRatio + 0.1;

    if (validator.type === 'GOVERNMENT' && govRatio > maxGovRatio) {
      return false;
    }

    if (validator.type === 'CITIZEN' && citizenRatio > maxCitizenRatio) {
      return false;
    }

    // Add to pending validators
    this.state.pendingValidators.set(validator.address, validator);
    return true;
  }

  // Vote on a proposed block
  async voteOnBlock(
    block: Block,
    validatorAddress: string,
    validatorPrivateKey: string
  ): Promise<Vote> {
    const validator = this.state.currentValidators.get(validatorAddress);
    if (!validator || !validator.active) {
      throw new Error('Invalid or inactive validator');
    }

    const vote: Vote = {
      validatorAddress,
      blockHash: block.hash,
      blockHeight: block.header.height,
      signature: CryptoUtils.sign(validatorPrivateKey, block.hash),
      timestamp: Date.now(),
    };

    // Initialize votes array if it doesn't exist
    if (!this.votes.has(block.hash)) {
      this.votes.set(block.hash, []);
    }

    // Add vote to collection
    const blockVotes = this.votes.get(block.hash)!;

    // Check if this validator already voted
    const hasAlreadyVoted = blockVotes.some(
      (v) => v.validatorAddress === validatorAddress
    );
    if (!hasAlreadyVoted) {
      blockVotes.push(vote);
    }

    // Check if we have enough votes BEFORE potentially finalizing
    const hasReachedConsensus = this.hasConsensus(block.hash);

    // Only finalize if consensus is reached AND we haven't finalized yet
    if (hasReachedConsensus && this.votes.has(block.hash)) {
      this.finalizeBlock(block);
    }

    return vote;
  }

  private hasConsensus(blockHash: string): boolean {
    const votes = this.votes.get(blockHash);
    if (!votes || votes.length === 0) {
      return false;
    }

    // Count unique voters to avoid double voting
    const uniqueVoters = new Set(votes.map((v) => v.validatorAddress));

    let totalVotingPower = 0;
    let collectedVotingPower = 0;

    this.state.currentValidators.forEach((validator) => {
      totalVotingPower += validator.votingPower;

      if (uniqueVoters.has(validator.address)) {
        collectedVotingPower += validator.votingPower;
      }
    });

    if (totalVotingPower === 0) return false;

    const consensusRatio = collectedVotingPower / totalVotingPower;

    // Use a small epsilon for floating point comparison
    const epsilon = 0.0001;
    return consensusRatio >= this.config.requiredConsensus - epsilon;
  }
  // Select next block proposer (round-robin)
  private selectNextProposer(): void {
    const validators = Array.from(this.state.currentValidators.values())
      .filter((v) => v.active)
      .sort((a, b) => a.address.localeCompare(b.address));

    if (validators.length === 0) {
      throw new Error('No active validators');
    }

    const currentIndex = validators.findIndex(
      (v) => v.address === this.state.currentProposer
    );
    const nextIndex = (currentIndex + 1) % validators.length;
    this.state.currentProposer = validators[nextIndex].address;
    this.state.round++;
  }

  // Initialize with genesis validators
  initializeGenesis(validators: Validator[]): void {
    validators.forEach((validator) => {
      this.state.currentValidators.set(validator.address, validator);
    });

    // Select first proposer (sort by address for deterministic selection)
    const sortedValidators = validators.sort((a, b) =>
      a.address.localeCompare(b.address)
    );

    if (sortedValidators.length > 0) {
      this.state.currentProposer = sortedValidators[0].address;
    }
  }

  // Finalize a block after consensus
  private finalizeBlock(block: Block): void {
    // Clear votes AFTER we're done with finalization
    // This prevents the votes from being cleared too early

    // Update validator states
    this.state.currentValidators.forEach((validator) => {
      validator.lastActiveBlock = block.header.height;
    });

    // Rotate validators if needed
    if (
      block.header.height - this.state.lastRotationBlock >=
      this.config.validatorRotationInterval
    ) {
      this.rotateValidators(block.header.height);
    }

    // Select next proposer
    this.selectNextProposer();

    // Callback to blockchain
    if (this.onBlockFinalized) {
      this.onBlockFinalized(block);
    }

    // Clear votes LAST
    this.votes.delete(block.hash);
  }

  // Rotate validators
  private rotateValidators(currentHeight: number): void {
    // Move pending validators to active
    this.state.pendingValidators.forEach((validator, address) => {
      this.state.currentValidators.set(address, validator);
    });
    this.state.pendingValidators.clear();

    // Remove inactive validators
    const toRemove: string[] = [];
    this.state.currentValidators.forEach((validator, address) => {
      if (currentHeight - validator.lastActiveBlock > 100) {
        toRemove.push(address);
      }
    });

    toRemove.forEach((address) => {
      this.state.currentValidators.delete(address);
    });

    this.state.lastRotationBlock = currentHeight;
  }

  // Get current consensus state
  getState(): ConsensusState {
    return this.state;
  }

  // Get validator by address
  getValidator(address: string): Validator | undefined {
    return this.state.currentValidators.get(address);
  }
}
