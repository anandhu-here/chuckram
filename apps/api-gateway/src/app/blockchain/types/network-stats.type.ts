// apps/api-gateway/src/app/blockchain/types/network-stats.type.ts

import { ObjectType, Field, Int, Float } from '@nestjs/graphql';

@ObjectType()
export class NetworkStatsType {
  @Field(() => Int)
  blockHeight!: number;

  @Field(() => Int)
  transactionCount!: number;

  @Field(() => Int)
  validatorCount!: number;

  @Field(() => Int)
  activeValidators!: number;

  @Field(() => Float)
  averageBlockTime!: number;

  @Field(() => Int)
  totalAccounts!: number;

  @Field()
  totalSupply!: string;

  @Field()
  circulatingSupply!: string;

  @Field(() => Int)
  transactionsPerSecond!: number;

  @Field(() => Int)
  lastBlockTime!: number;
}
