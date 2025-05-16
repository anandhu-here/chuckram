// libs/core/voting/src/lib/proposal-manager.ts

import {
  Proposal,
  ProposalStatus,
  ProposalType,
  VotingConfig,
  DEFAULT_VOTING_CONFIG,
} from '@digital-chuckram/types';
import { v4 as uuidv4 } from 'uuid';

export class ProposalManager {
  private proposals: Map<string, Proposal>;
  private config: VotingConfig;
  private lastProposalByCreator: Map<string, number>;

  constructor(config?: Partial<VotingConfig>) {
    this.proposals = new Map();
    this.config = { ...DEFAULT_VOTING_CONFIG, ...config };
    this.lastProposalByCreator = new Map();
  }

  /**
   * Create a new proposal
   */
  createProposal(
    type: ProposalType,
    title: string,
    description: string,
    creator: string,
    executionData?: any,
    metadata?: Record<string, any>
  ): Proposal {
    // Check cooldown period
    this.checkCooldownPeriod(creator);

    const now = Date.now();
    const duration = this.config.proposalDuration[type];

    const proposal: Proposal = {
      id: uuidv4(),
      type,
      title,
      description,
      creator,
      createdAt: now,
      startTime: now,
      endTime: now + duration * 1000,
      status: ProposalStatus.ACTIVE,
      requiredApproval: this.config.requiredApproval[type],
      minQuorum: this.config.minQuorum[type],
      executionData,
      metadata,
    };

    this.proposals.set(proposal.id, proposal);
    this.lastProposalByCreator.set(creator, now);

    return proposal;
  }

  /**
   * Get a proposal by ID
   */
  getProposal(id: string): Proposal | undefined {
    return this.proposals.get(id);
  }

  /**
   * Get all proposals
   */
  getAllProposals(): Proposal[] {
    return Array.from(this.proposals.values());
  }

  /**
   * Get proposals by status
   */
  getProposalsByStatus(status: ProposalStatus): Proposal[] {
    return this.getAllProposals().filter((p) => p.status === status);
  }

  /**
   * Get proposals by creator
   */
  getProposalsByCreator(creator: string): Proposal[] {
    return this.getAllProposals().filter((p) => p.creator === creator);
  }

  /**
   * Update proposal status
   */
  updateProposalStatus(id: string, status: ProposalStatus): void {
    const proposal = this.proposals.get(id);
    if (!proposal) {
      throw new Error(`Proposal ${id} not found`);
    }

    // Validate status transition
    this.validateStatusTransition(proposal.status, status);

    proposal.status = status;
  }

  /**
   * Check if proposal is active
   */
  isProposalActive(id: string, currentTime: number): boolean {
    const proposal = this.proposals.get(id);
    if (!proposal) return false;

    return (
      proposal.status === ProposalStatus.ACTIVE &&
      currentTime >= proposal.startTime &&
      currentTime <= proposal.endTime
    );
  }

  /**
   * Check if proposal has ended
   */
  hasProposalEnded(id: string, currentTime: number): boolean {
    const proposal = this.proposals.get(id);
    if (!proposal) return true;

    return currentTime > proposal.endTime;
  }

  /**
   * Close expired proposals
   */
  closeExpiredProposals(currentTime: number): string[] {
    const closedProposals: string[] = [];

    for (const proposal of this.proposals.values()) {
      if (
        proposal.status === ProposalStatus.ACTIVE &&
        currentTime > proposal.endTime
      ) {
        proposal.status = ProposalStatus.CLOSED;
        closedProposals.push(proposal.id);
      }
    }

    return closedProposals;
  }

  /**
   * Mark proposal as passed
   */
  markProposalPassed(id: string): void {
    const proposal = this.proposals.get(id);
    if (!proposal) {
      throw new Error(`Proposal ${id} not found`);
    }

    if (proposal.status !== ProposalStatus.CLOSED) {
      throw new Error('Only closed proposals can be marked as passed');
    }

    proposal.status = ProposalStatus.PASSED;
  }

  /**
   * Mark proposal as rejected
   */
  markProposalRejected(id: string): void {
    const proposal = this.proposals.get(id);
    if (!proposal) {
      throw new Error(`Proposal ${id} not found`);
    }

    if (proposal.status !== ProposalStatus.CLOSED) {
      throw new Error('Only closed proposals can be marked as rejected');
    }

    proposal.status = ProposalStatus.REJECTED;
  }

  /**
   * Mark proposal as executed
   */
  markProposalExecuted(id: string): void {
    const proposal = this.proposals.get(id);
    if (!proposal) {
      throw new Error(`Proposal ${id} not found`);
    }

    if (proposal.status !== ProposalStatus.PASSED) {
      throw new Error('Only passed proposals can be executed');
    }

    proposal.status = ProposalStatus.EXECUTED;
  }

  /**
   * Cancel a proposal
   */
  cancelProposal(id: string, canceller: string): void {
    const proposal = this.proposals.get(id);
    if (!proposal) {
      throw new Error(`Proposal ${id} not found`);
    }

    // Only creator can cancel (or admin in real implementation)
    if (proposal.creator !== canceller) {
      throw new Error('Only proposal creator can cancel');
    }

    if (proposal.status !== ProposalStatus.ACTIVE) {
      throw new Error('Only active proposals can be cancelled');
    }

    proposal.status = ProposalStatus.CANCELLED;
  }

  /**
   * Get proposals ready for execution
   */
  getExecutableProposals(currentTime: number): Proposal[] {
    const executionDelay = this.config.executionDelay * 1000;

    return this.getAllProposals().filter(
      (p) =>
        p.status === ProposalStatus.PASSED &&
        currentTime >= p.endTime + executionDelay
    );
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<VotingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): VotingConfig {
    return { ...this.config };
  }

  /**
   * Check cooldown period for creator
   */
  private checkCooldownPeriod(creator: string): void {
    const lastProposal = this.lastProposalByCreator.get(creator);
    if (!lastProposal) return;

    const cooldownEnd = lastProposal + this.config.proposalCooldown * 1000;
    const now = Date.now();

    if (now < cooldownEnd) {
      const remainingTime = Math.ceil((cooldownEnd - now) / 1000);
      throw new Error(
        `Creator must wait ${remainingTime} seconds before creating another proposal`
      );
    }
  }

  /**
   * Validate status transitions
   */
  private validateStatusTransition(
    from: ProposalStatus,
    to: ProposalStatus
  ): void {
    const validTransitions: Record<ProposalStatus, ProposalStatus[]> = {
      [ProposalStatus.DRAFT]: [ProposalStatus.ACTIVE, ProposalStatus.CANCELLED],
      [ProposalStatus.ACTIVE]: [
        ProposalStatus.CLOSED,
        ProposalStatus.CANCELLED,
      ],
      [ProposalStatus.CLOSED]: [ProposalStatus.PASSED, ProposalStatus.REJECTED],
      [ProposalStatus.PASSED]: [ProposalStatus.EXECUTED],
      [ProposalStatus.REJECTED]: [],
      [ProposalStatus.EXECUTED]: [],
      [ProposalStatus.CANCELLED]: [],
    };

    if (!validTransitions[from].includes(to)) {
      throw new Error(`Invalid status transition from ${from} to ${to}`);
    }
  }

  /**
   * Export proposals data
   */
  export(): Proposal[] {
    return Array.from(this.proposals.values());
  }

  /**
   * Import proposals data
   */
  import(data: Proposal[]): void {
    this.proposals.clear();
    this.lastProposalByCreator.clear();

    for (const proposal of data) {
      this.proposals.set(proposal.id, proposal);
      this.lastProposalByCreator.set(proposal.creator, proposal.createdAt);
    }
  }
}
