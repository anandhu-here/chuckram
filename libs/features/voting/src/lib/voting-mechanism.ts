// libs/core/voting/src/lib/voting-mechanism.ts

import {
  ProposalVote,
  VoteChoice,
  VotingResult,
} from '@digital-chuckram/types';
import { VotingRightsManager } from './voting-rights-manager';
import { ProposalManager } from './proposal-manager';
import { createHash } from 'crypto';

export class VotingMechanism {
  private votes: Map<string, ProposalVote[]>; // proposalId -> votes
  private votersByProposal: Map<string, Set<string>>; // proposalId -> voters
  private votingRightsManager: VotingRightsManager;
  private proposalManager: ProposalManager;

  constructor(
    votingRightsManager: VotingRightsManager,
    proposalManager: ProposalManager
  ) {
    this.votes = new Map();
    this.votersByProposal = new Map();
    this.votingRightsManager = votingRightsManager;
    this.proposalManager = proposalManager;
  }

  /**
   * Cast a vote
   */
  castVote(
    proposalId: string,
    voter: string,
    choice: VoteChoice,
    signature: string,
    reason?: string
  ): ProposalVote {
    const now = Date.now();

    // Validate proposal exists and is active
    const proposal = this.proposalManager.getProposal(proposalId);
    if (!proposal) {
      throw new Error(`Proposal ${proposalId} not found`);
    }

    if (!this.proposalManager.isProposalActive(proposalId, now)) {
      throw new Error('Proposal is not active');
    }

    // Check voting rights
    const votingPower = this.votingRightsManager.getEffectiveVotingPower(voter);
    if (votingPower === 0n) {
      throw new Error('No voting power');
    }

    // Check if already voted
    const proposalVoters = this.votersByProposal.get(proposalId) || new Set();
    if (proposalVoters.has(voter)) {
      throw new Error('Already voted on this proposal');
    }

    // Check if voting rights are locked
    if (this.votingRightsManager.areVotingRightsLocked(voter, now)) {
      throw new Error('Voting rights are locked');
    }

    // Verify signature
    if (!this.verifyVoteSignature(proposalId, voter, choice, signature)) {
      throw new Error('Invalid vote signature');
    }

    // Create vote
    const vote: ProposalVote = {
      proposalId,
      voter,
      choice,
      votingPower,
      timestamp: now,
      reason,
      signature,
    };

    // Store vote
    if (!this.votes.has(proposalId)) {
      this.votes.set(proposalId, []);
    }
    this.votes.get(proposalId)!.push(vote);

    // Record voter
    proposalVoters.add(voter);
    this.votersByProposal.set(proposalId, proposalVoters);

    // Update last voted time
    const votingRights = this.votingRightsManager.getVotingRights(voter);
    if (votingRights) {
      votingRights.lastVoted = now;
    }

    return vote;
  }

  /**
   * Get votes for a proposal
   */
  getVotes(proposalId: string): ProposalVote[] {
    return this.votes.get(proposalId) || [];
  }

  /**
   * Get vote by voter for a proposal
   */
  getVoteByVoter(proposalId: string, voter: string): ProposalVote | undefined {
    const votes = this.getVotes(proposalId);
    return votes.find((v) => v.voter === voter);
  }

  /**
   * Calculate voting results
   */
  calculateResults(proposalId: string): VotingResult {
    const votes = this.getVotes(proposalId);
    const proposal = this.proposalManager.getProposal(proposalId);

    if (!proposal) {
      throw new Error(`Proposal ${proposalId} not found`);
    }

    let forVotes = 0n;
    let againstVotes = 0n;
    let abstainVotes = 0n;
    const uniqueVoters = new Set<string>();

    for (const vote of votes) {
      uniqueVoters.add(vote.voter);

      switch (vote.choice) {
        case VoteChoice.FOR:
          forVotes += vote.votingPower;
          break;
        case VoteChoice.AGAINST:
          againstVotes += vote.votingPower;
          break;
        case VoteChoice.ABSTAIN:
          abstainVotes += vote.votingPower;
          break;
      }
    }

    const totalVotes = forVotes + againstVotes + abstainVotes;
    const totalVotingPower = this.votingRightsManager.getTotalVotingPower();

    // Calculate approval percentage (excluding abstentions)
    const validVotes = forVotes + againstVotes;
    const approvalPercentage =
      validVotes > 0n ? Number((forVotes * 100n) / validVotes) : 0;

    // Check quorum
    const participationPercentage =
      totalVotingPower > 0n
        ? Number((totalVotes * 100n) / totalVotingPower)
        : 0;
    const quorumMet = participationPercentage >= proposal.minQuorum;

    // Check if passed
    const passed = quorumMet && approvalPercentage >= proposal.requiredApproval;

    return {
      proposalId,
      totalVotes,
      forVotes,
      againstVotes,
      abstainVotes,
      uniqueVoters: uniqueVoters.size,
      passed,
      quorumMet,
      approvalPercentage,
    };
  }

  /**
   * Finalize voting on a proposal
   */
  finalizeVoting(proposalId: string): VotingResult {
    const proposal = this.proposalManager.getProposal(proposalId);
    if (!proposal) {
      throw new Error(`Proposal ${proposalId} not found`);
    }

    if (!this.proposalManager.hasProposalEnded(proposalId, Date.now())) {
      throw new Error('Voting period has not ended');
    }

    const results = this.calculateResults(proposalId);

    // Update proposal status
    if (results.passed) {
      this.proposalManager.markProposalPassed(proposalId);
    } else {
      this.proposalManager.markProposalRejected(proposalId);
    }

    return results;
  }

  /**
   * Get all voters for a proposal
   */
  getVoters(proposalId: string): string[] {
    const voters = this.votersByProposal.get(proposalId);
    return voters ? Array.from(voters) : [];
  }

  /**
   * Check if address has voted on proposal
   */
  hasVoted(proposalId: string, voter: string): boolean {
    const voters = this.votersByProposal.get(proposalId);
    return voters ? voters.has(voter) : false;
  }

  /**
   * Get vote statistics
   */
  getVoteStatistics(proposalId: string): {
    totalVoters: number;
    voteDistribution: Record<VoteChoice, number>;
    powerDistribution: Record<VoteChoice, string>;
  } {
    const votes = this.getVotes(proposalId);

    const voteDistribution: Record<VoteChoice, number> = {
      [VoteChoice.FOR]: 0,
      [VoteChoice.AGAINST]: 0,
      [VoteChoice.ABSTAIN]: 0,
    };

    const powerDistribution: Record<VoteChoice, bigint> = {
      [VoteChoice.FOR]: 0n,
      [VoteChoice.AGAINST]: 0n,
      [VoteChoice.ABSTAIN]: 0n,
    };

    for (const vote of votes) {
      voteDistribution[vote.choice]++;
      powerDistribution[vote.choice] += vote.votingPower;
    }

    return {
      totalVoters: votes.length,
      voteDistribution,
      powerDistribution: {
        [VoteChoice.FOR]: powerDistribution[VoteChoice.FOR].toString(),
        [VoteChoice.AGAINST]: powerDistribution[VoteChoice.AGAINST].toString(),
        [VoteChoice.ABSTAIN]: powerDistribution[VoteChoice.ABSTAIN].toString(),
      },
    };
  }

  /**
   * Verify vote signature
   */
  private verifyVoteSignature(
    proposalId: string,
    voter: string,
    choice: VoteChoice,
    signature: string
  ): boolean {
    // In a real implementation, this would verify the signature
    // using the voter's public key and the vote data

    // For this example, we'll just check that signature is not empty
    return signature.length > 0;
  }

  /**
   * Generate vote message for signing
   */
  generateVoteMessage(
    proposalId: string,
    voter: string,
    choice: VoteChoice
  ): string {
    const data = `${proposalId}:${voter}:${choice}:${Date.now()}`;
    const hash = createHash('sha256');
    hash.update(data);
    return hash.digest('hex');
  }

  /**
   * Export votes data
   */
  export(): Record<string, ProposalVote[]> {
    const exportData: Record<string, ProposalVote[]> = {};

    for (const [proposalId, votes] of this.votes.entries()) {
      exportData[proposalId] = [...votes];
    }

    return exportData;
  }

  /**
   * Import votes data
   */
  import(data: Record<string, ProposalVote[]>): void {
    this.votes.clear();
    this.votersByProposal.clear();

    for (const [proposalId, votes] of Object.entries(data)) {
      this.votes.set(proposalId, [...votes]);

      const voters = new Set<string>();
      for (const vote of votes) {
        voters.add(vote.voter);
      }

      this.votersByProposal.set(proposalId, voters);
    }
  }
}
