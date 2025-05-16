// libs/core/voting/src/lib/voting-rights-manager.ts

import { VotingRights } from '@digital-chuckram/types';

export class VotingRightsManager {
  private votingRights: Map<string, VotingRights>;
  private totalVotingPower: bigint;

  constructor() {
    this.votingRights = new Map();
    this.totalVotingPower = 0n;
  }

  /**
   * Issue voting rights to a citizen
   */
  issueVotingRights(address: string, votingPower: bigint = 1n): VotingRights {
    if (this.votingRights.has(address)) {
      throw new Error(`Voting rights already issued to ${address}`);
    }

    const rights: VotingRights = {
      address,
      votingPower,
      delegatedFrom: [],
      lastVoted: undefined,
      lockedUntil: undefined,
    };

    this.votingRights.set(address, rights);
    this.totalVotingPower += votingPower;

    return rights;
  }

  /**
   * Revoke voting rights (only in specific circumstances)
   */
  revokeVotingRights(address: string, reason: string): void {
    const rights = this.votingRights.get(address);
    if (!rights) {
      throw new Error(`No voting rights found for ${address}`);
    }

    // Return delegated votes
    if (rights.delegatedTo) {
      this.undelegate(address);
    }

    // Remove delegations from this address
    for (const delegator of rights.delegatedFrom) {
      const delegatorRights = this.votingRights.get(delegator);
      if (delegatorRights) {
        delegatorRights.delegatedTo = undefined;
      }
    }

    this.totalVotingPower -= rights.votingPower;
    this.votingRights.delete(address);
  }

  /**
   * Get voting rights for an address
   */
  getVotingRights(address: string): VotingRights | undefined {
    return this.votingRights.get(address);
  }

  /**
   * Get effective voting power (including delegations)
   */
  getEffectiveVotingPower(address: string): bigint {
    const rights = this.votingRights.get(address);
    if (!rights) return 0n;

    // If delegated, return 0
    if (rights.delegatedTo) return 0n;

    // Calculate total power including delegations
    let totalPower = rights.votingPower;

    for (const delegator of rights.delegatedFrom) {
      const delegatorRights = this.votingRights.get(delegator);
      if (delegatorRights) {
        totalPower += delegatorRights.votingPower;
      }
    }

    return totalPower;
  }

  /**
   * Delegate voting power to another address
   */
  delegate(from: string, to: string): void {
    if (from === to) {
      throw new Error('Cannot delegate to self');
    }

    const fromRights = this.votingRights.get(from);
    const toRights = this.votingRights.get(to);

    if (!fromRights) {
      throw new Error(`No voting rights found for ${from}`);
    }

    if (!toRights) {
      throw new Error(`No voting rights found for ${to}`);
    }

    if (fromRights.delegatedTo) {
      throw new Error(`${from} has already delegated their vote`);
    }

    if (toRights.delegatedTo) {
      throw new Error(
        `Cannot delegate to ${to} as they have delegated their vote`
      );
    }

    // Check for circular delegation
    if (this.wouldCreateCircularDelegation(from, to)) {
      throw new Error('This delegation would create a circular dependency');
    }

    fromRights.delegatedTo = to;
    toRights.delegatedFrom.push(from);
  }

  /**
   * Remove delegation
   */
  undelegate(address: string): void {
    const rights = this.votingRights.get(address);
    if (!rights || !rights.delegatedTo) {
      throw new Error(`${address} has not delegated their vote`);
    }

    const delegateRights = this.votingRights.get(rights.delegatedTo);
    if (delegateRights) {
      const index = delegateRights.delegatedFrom.indexOf(address);
      if (index > -1) {
        delegateRights.delegatedFrom.splice(index, 1);
      }
    }

    rights.delegatedTo = undefined;
  }

  /**
   * Check if delegation would create circular dependency
   */
  private wouldCreateCircularDelegation(from: string, to: string): boolean {
    const visited = new Set<string>();
    let current = to;

    while (current) {
      if (current === from) return true;
      if (visited.has(current)) return false;

      visited.add(current);
      const rights = this.votingRights.get(current);
      current = rights?.delegatedTo || '';
    }

    return false;
  }

  /**
   * Lock voting rights until a specific time
   */
  lockVotingRights(address: string, until: number): void {
    const rights = this.votingRights.get(address);
    if (!rights) {
      throw new Error(`No voting rights found for ${address}`);
    }

    rights.lockedUntil = until;
  }

  /**
   * Check if voting rights are locked
   */
  areVotingRightsLocked(address: string, currentTime: number): boolean {
    const rights = this.votingRights.get(address);
    if (!rights) return true;

    return rights.lockedUntil !== undefined && currentTime < rights.lockedUntil;
  }

  /**
   * Get all addresses with voting rights
   */
  getAllVoters(): string[] {
    return Array.from(this.votingRights.keys());
  }

  /**
   * Get total voting power in the system
   */
  getTotalVotingPower(): bigint {
    return this.totalVotingPower;
  }

  /**
   * Get delegation chain for an address
   */
  getDelegationChain(address: string): string[] {
    const chain: string[] = [];
    let current = address;
    const visited = new Set<string>();

    while (current) {
      if (visited.has(current)) break;
      visited.add(current);

      const rights = this.votingRights.get(current);
      if (!rights || !rights.delegatedTo) break;

      chain.push(rights.delegatedTo);
      current = rights.delegatedTo;
    }

    return chain;
  }

  /**
   * Get all addresses that have delegated to a specific address
   */
  getDelegators(address: string): string[] {
    const rights = this.votingRights.get(address);
    return rights ? [...rights.delegatedFrom] : [];
  }

  /**
   * Export voting rights data
   */
  export(): VotingRights[] {
    return Array.from(this.votingRights.values());
  }

  /**
   * Import voting rights data
   */
  import(data: VotingRights[]): void {
    this.votingRights.clear();
    this.totalVotingPower = 0n;

    for (const rights of data) {
      this.votingRights.set(rights.address, rights);
      this.totalVotingPower += rights.votingPower;
    }
  }
}
