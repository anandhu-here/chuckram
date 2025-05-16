// apps/api-gateway/src/app/blockchain/blockchain.resolver.ts

import { Resolver, Query, Args, Int, Mutation } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { BlockInfoType } from './types/block-info.type';
import { BlockType } from './types/block.type';
import { TransactionType } from './types/transaction.type';
import { AddressDetailsType } from './types/address-details.type';
import { ValidatorType } from './types/validator.type';
import { NetworkStatsType } from './types/network-stats.type';
import { TransactionInput } from './inputs/transaction.input';

@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
export class BlockchainResolver {
  constructor(private readonly blockchainService: BlockchainService) {}

  @Public()
  @Query(() => BlockInfoType, { description: 'Get blockchain info' })
  async blockchainInfo() {
    return this.blockchainService.getBlockchainInfo();
  }

  @Public()
  @Query(() => [BlockType], { description: 'Get latest blocks' })
  async latestBlocks(
    @Args('limit', { type: () => Int, nullable: true }) limit?: number
  ) {
    return this.blockchainService.getLatestBlocks(limit);
  }

  @Public()
  @Query(() => BlockType, { description: 'Get block by height' })
  async blockByHeight(@Args('height', { type: () => Int }) height: number) {
    return this.blockchainService.getBlockByHeight(height);
  }

  @Public()
  @Query(() => BlockType, { description: 'Get block by hash' })
  async blockByHash(@Args('hash') hash: string) {
    return this.blockchainService.getBlockByHash(hash);
  }

  @Public()
  @Query(() => TransactionType, { description: 'Get transaction by ID' })
  async transaction(@Args('id') id: string) {
    return this.blockchainService.getTransaction(id);
  }

  @Public()
  @Query(() => AddressDetailsType, { description: 'Get address details' })
  async addressDetails(@Args('address') address: string) {
    return this.blockchainService.getAddressDetails(address);
  }

  @Public()
  @Query(() => [TransactionType], { description: 'Get address transactions' })
  async addressTransactions(
    @Args('address') address: string,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
    @Args('offset', { type: () => Int, nullable: true }) offset?: number
  ) {
    return this.blockchainService.getAddressTransactions(
      address,
      limit,
      offset
    );
  }

  @Public()
  @Query(() => String, { description: 'Get address balance' })
  async addressBalance(@Args('address') address: string) {
    const result: any = await this.blockchainService.getAddressBalance(address);
    return result.balance;
  }

  @Public()
  @Query(() => [ValidatorType], { description: 'Get validators' })
  async validators() {
    return this.blockchainService.getValidators();
  }

  @Public()
  @Query(() => ValidatorType, { description: 'Get validator details' })
  async validatorDetails(@Args('address') address: string) {
    return this.blockchainService.getValidatorDetails(address);
  }

  @Public()
  @Query(() => [TransactionType], { description: 'Get mempool transactions' })
  async mempoolTransactions(
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
    @Args('offset', { type: () => Int, nullable: true }) offset?: number
  ) {
    return this.blockchainService.getMempoolTransactions(limit, offset);
  }

  @Public()
  @Query(() => NetworkStatsType, { description: 'Get network statistics' })
  async networkStats() {
    return this.blockchainService.getNetworkStats();
  }

  @Mutation(() => TransactionType, { description: 'Create transaction' })
  async createTransaction(@Args('input') input: TransactionInput) {
    return this.blockchainService.createTransaction(input as any);
  }

  @Query(() => BlockInfoType, {
    description: 'Get blockchain status (admin only)',
  })
  @Roles('admin')
  async blockchainStatus() {
    return this.blockchainService.getBlockchainInfo();
  }
}
