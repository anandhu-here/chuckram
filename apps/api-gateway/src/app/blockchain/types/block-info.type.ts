// apps/api-gateway/src/app/blockchain/types/block-info.type.ts

import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class BlockInfoType {
  @Field(() => Int)
  height!: number;

  @Field()
  chainId!: string;

  @Field()
  protocolVersion!: string;

  @Field()
  genesisHash!: string;

  @Field()
  lastBlockHash!: string;

  @Field(() => Int)
  lastBlockTime!: number;

  @Field(() => Int)
  validatorCount!: number;

  @Field(() => Int)
  transactionCount!: number;

  @Field(() => Int)
  syncedHeight!: number;

  @Field(() => Boolean)
  synced!: boolean;
}
