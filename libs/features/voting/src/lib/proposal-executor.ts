// libs/core/voting/src/lib/proposal-executor.ts

import { Proposal, ProposalStatus } from '@digital-chuckram/types';
import { ProposalManager } from './proposal-manager';

// Define the executor function type
export type ExecutorFunction = (proposal: Proposal) => Promise<boolean>;

export class ProposalExecutor {
  private proposalManager: ProposalManager;
  private executors: Map<string, ExecutorFunction>; // type -> executor function
  private executionQueue: string[]; // proposal IDs
  private executing: boolean;

  constructor(proposalManager: ProposalManager) {
    this.proposalManager = proposalManager;
    this.executors = new Map();
    this.executionQueue = [];
    this.executing = false;
  }

  /**
   * Register an executor for a proposal type
   */
  registerExecutor(type: string, executor: ExecutorFunction): void {
    this.executors.set(type, executor);
  }

  /**
   * Queue proposals ready for execution
   */
  queueExecutableProposals(): void {
    const now = Date.now();
    const executableProposals =
      this.proposalManager.getExecutableProposals(now);

    for (const proposal of executableProposals) {
      if (!this.executionQueue.includes(proposal.id)) {
        this.executionQueue.push(proposal.id);
      }
    }
  }

  /**
   * Execute proposals in queue
   */
  async executeProposals(): Promise<{
    executed: string[];
    failed: string[];
    skipped: string[];
  }> {
    if (this.executing) {
      return { executed: [], failed: [], skipped: this.executionQueue };
    }

    this.executing = true;
    const executed: string[] = [];
    const failed: string[] = [];
    const skipped: string[] = [];

    try {
      while (this.executionQueue.length > 0) {
        const proposalId = this.executionQueue[0];
        const proposal = this.proposalManager.getProposal(proposalId);

        if (!proposal) {
          skipped.push(proposalId);
          this.executionQueue.shift();
          continue;
        }

        if (proposal.status !== ProposalStatus.PASSED) {
          skipped.push(proposalId);
          this.executionQueue.shift();
          continue;
        }

        const executor = this.executors.get(proposal.type);
        if (!executor) {
          // No executor for this type
          skipped.push(proposalId);
          this.executionQueue.shift();
          continue;
        }

        // Execute proposal
        try {
          const success = await executor(proposal);

          if (success) {
            this.proposalManager.markProposalExecuted(proposalId);
            executed.push(proposalId);
          } else {
            failed.push(proposalId);
          }
        } catch (error) {
          console.error(`Error executing proposal ${proposalId}:`, error);
          failed.push(proposalId);
        }

        this.executionQueue.shift();
      }
    } finally {
      this.executing = false;
    }

    return { executed, failed, skipped };
  }

  /**
   * Execute a specific proposal
   */
  async executeProposal(proposalId: string): Promise<boolean> {
    const proposal = this.proposalManager.getProposal(proposalId);
    if (!proposal) {
      throw new Error(`Proposal ${proposalId} not found`);
    }

    if (proposal.status !== ProposalStatus.PASSED) {
      throw new Error(`Proposal ${proposalId} is not in PASSED status`);
    }

    const executor = this.executors.get(proposal.type);
    if (!executor) {
      throw new Error(
        `No executor registered for proposal type ${proposal.type}`
      );
    }

    try {
      const success = await executor(proposal);

      if (success) {
        this.proposalManager.markProposalExecuted(proposalId);
      }

      return success;
    } catch (error) {
      console.error(`Error executing proposal ${proposalId}:`, error);
      return false;
    }
  }

  /**
   * Check if a proposal can be executed
   */
  canExecuteProposal(proposalId: string): boolean {
    const proposal = this.proposalManager.getProposal(proposalId);
    if (!proposal) return false;

    if (proposal.status !== ProposalStatus.PASSED) return false;

    const now = Date.now();
    const executionTime =
      proposal.endTime + this.proposalManager.getConfig().executionDelay * 1000;

    return now >= executionTime && this.executors.has(proposal.type);
  }

  /**
   * Get the execution time for a proposal
   */
  getExecutionTime(proposalId: string): number | null {
    const proposal = this.proposalManager.getProposal(proposalId);
    if (!proposal || proposal.status !== ProposalStatus.PASSED) return null;

    return (
      proposal.endTime + this.proposalManager.getConfig().executionDelay * 1000
    );
  }

  /**
   * Get execution queue
   */
  getExecutionQueue(): string[] {
    return [...this.executionQueue];
  }

  /**
   * Clear execution queue
   */
  clearExecutionQueue(): void {
    this.executionQueue = [];
  }
}
