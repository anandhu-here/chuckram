// apps/api-gateway/src/app/blockchain/types/block.type.ts

import { ObjectType, Field, Int } from '@nestjs/graphql';
import { TransactionType } from './transaction.type';

@ObjectType()
export class BlockHeaderType {
  @Field(() => Int)
  version!: number;

  @Field()
  previousHash!: string;

  @Field()
  merkleRoot!: string;

  @Field(() => Int)
  timestamp!: number;

  @Field(() => Int)
  height!: number;

  @Field()
  validatorAddress!: string;

  @Field({ nullable: true })
  validatorSignature?: string;
}

@ObjectType()
export class BlockType {
  @Field()
  hash!: string;

  @Field(() => BlockHeaderType)
  header!: BlockHeaderType;

  @Field(() => [TransactionType])
  transactions!: TransactionType[];

  @Field(() => Int)
  nonce!: number;

  @Field(() => Int)
  size!: number;

  @Field(() => Int)
  transactionCount!: number;
}
