// Export main classes
export { VotingRightsManager } from './lib/voting-rights-manager';
export { ProposalManager } from './lib/proposal-manager';
export { VotingMechanism } from './lib/voting-mechanism';
export { ProposalExecutor } from './lib/proposal-executor';

// Re-export specific types for convenience
import {
  VoteChoice,
  ProposalType,
  Proposal,
  VotingConfig,
} from '@digital-chuckram/types';
import { VotingRightsManager } from './lib/voting-rights-manager';
import { ProposalManager } from './lib/proposal-manager';
import { VotingMechanism } from './lib/voting-mechanism';
import { ProposalExecutor } from './lib/proposal-executor';

// Create a convenient factory function to initialize the voting system
export function createVotingSystem(config?: Partial<VotingConfig>) {
  const votingRights = new VotingRightsManager();
  const proposalManager = new ProposalManager(config);
  const votingMechanism = new VotingMechanism(votingRights, proposalManager);
  const proposalExecutor = new ProposalExecutor(proposalManager);

  return {
    votingRights,
    proposalManager,
    votingMechanism,
    proposalExecutor,

    // Utility methods
    issueVotingRightsToCitizen(address: string, votingPower: bigint = 1n) {
      return votingRights.issueVotingRights(address, votingPower);
    },

    createProposal(
      type: ProposalType,
      title: string,
      description: string,
      creator: string,
      executionData?: any,
      metadata?: Record<string, any>
    ) {
      return proposalManager.createProposal(
        type,
        title,
        description,
        creator,
        executionData,
        metadata
      );
    },

    castVote(
      proposalId: string,
      voter: string,
      choice: VoteChoice,
      signature: string,
      reason?: string
    ) {
      return votingMechanism.castVote(
        proposalId,
        voter,
        choice,
        signature,
        reason
      );
    },

    getResults(proposalId: string) {
      return votingMechanism.calculateResults(proposalId);
    },

    finalizeVoting(proposalId: string) {
      return votingMechanism.finalizeVoting(proposalId);
    },

    registerExecutor(
      type: string,
      executor: (proposal: Proposal) => Promise<boolean>
    ) {
      proposalExecutor.registerExecutor(type, executor);
    },

    async executeProposals() {
      proposalExecutor.queueExecutableProposals();
      return await proposalExecutor.executeProposals();
    },
  };
}
