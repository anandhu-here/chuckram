import { ConsensusEngine } from './consensus';
import { ConsensusConfig, Validator } from '@digital-chuckram/types';
import { Block, TransactionType } from '@digital-chuckram/types';

describe('ConsensusEngine', () => {
  let consensus: ConsensusEngine;
  let config: ConsensusConfig;
  let validators: Validator[];

  beforeEach(() => {
    config = {
      minValidators: 4,
      maxValidators: 100,
      blockTime: 5000,
      governmentValidatorRatio: 0.5,
      citizenValidatorRatio: 0.5,
      requiredConsensus: 0.66,
      validatorRotationInterval: 100,
    };

    consensus = new ConsensusEngine(config);

    validators = [
      {
        address: 'GOV1',
        type: 'GOVERNMENT',
        votingPower: 1,
        active: true,
        lastActiveBlock: 0,
        registeredAt: Date.now(),
      },
      {
        address: 'GOV2',
        type: 'GOVERNMENT',
        votingPower: 1,
        active: true,
        lastActiveBlock: 0,
        registeredAt: Date.now(),
      },
      {
        address: 'CIT1',
        type: 'CITIZEN',
        stake: 1000n,
        votingPower: 1,
        active: true,
        lastActiveBlock: 0,
        registeredAt: Date.now(),
      },
      {
        address: 'CIT2',
        type: 'CITIZEN',
        stake: 1000n,
        votingPower: 1,
        active: true,
        lastActiveBlock: 0,
        registeredAt: Date.now(),
      },
    ];

    consensus.initializeGenesis(validators);
  });

  it('should initialize with genesis validators', () => {
    const state = consensus.getState();
    expect(state.currentValidators.size).toBe(4);
    expect(state.currentProposer).toBe('CIT1'); // First when sorted alphabetically
  });

  it('should enforce validator ratio limits', async () => {
    // Current state: 2 GOV, 2 CITIZEN (50/50)

    // Adding one more citizen should work (would be 40/60, within 10% deviation)
    const newCitizenValidator: Validator = {
      address: 'CIT3',
      type: 'CITIZEN',
      stake: 1000n,
      votingPower: 1,
      active: true,
      lastActiveBlock: 0,
      registeredAt: Date.now(),
    };

    const result = await consensus.addValidator(newCitizenValidator);
    expect(result).toBe(true);

    // Adding another citizen would make it 2/4 GOV (33%), 4/6 CIT (67%)
    // This exceeds the 60% limit for citizens
    const anotherCitizenValidator: Validator = {
      ...newCitizenValidator,
      address: 'CIT4',
    };
    const result2 = await consensus.addValidator(anotherCitizenValidator);
    expect(result2).toBe(false);
  });

  it('should select next proposer in round-robin', () => {
    const state1 = consensus.getState();
    const firstProposer = state1.currentProposer;

    // Manually trigger proposer rotation
    consensus['selectNextProposer']();

    const state2 = consensus.getState();
    expect(state2.currentProposer).not.toBe(firstProposer);
    expect(state2.round).toBe(1);
  });

  it('should track votes and determine consensus', async () => {
    const block: Block = {
      header: {
        version: 1,
        previousHash: '0',
        merkleRoot: '0',
        timestamp: Date.now(),
        height: 1,
        validatorAddress: 'GOV1',
      },
      transactions: [],
      hash: 'block1',
      nonce: 0,
    };

    // Track if block was finalized
    let blockFinalized = false;
    consensus['onBlockFinalized'] = (finalizedBlock: Block) => {
      blockFinalized = true;
      expect(finalizedBlock.hash).toBe(block.hash);
    };

    // With 4 validators, each with voting power 1:
    // Total voting power = 4
    // 66% of 4 = 2.64, so we need at least 3 votes

    // Vote with first validator
    await consensus.voteOnBlock(block, 'GOV1', 'privateKey1');
    expect(blockFinalized).toBe(false);

    // Vote with second validator
    await consensus.voteOnBlock(block, 'GOV2', 'privateKey2');
    expect(blockFinalized).toBe(false);

    // Vote with third validator - this should trigger consensus
    await consensus.voteOnBlock(block, 'CIT1', 'privateKey3');
    expect(blockFinalized).toBe(true);
  });
});
