// apps/api-gateway/src/app/blockchain/types/transaction.type.ts

import { ObjectType, Field, Int, registerEnumType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

export enum TransactionTypeEnum {
  TRANSFER = 'TRANSFER',
  VOTE = 'VOTE',
  PROPOSAL = 'PROPOSAL',
  VALIDATOR_REGISTRATION = 'VALIDATOR_REGISTRATION',
  IDENTITY_REGISTRATION = 'IDENTITY_REGISTRATION',
  REWARD = 'REWARD',
  FEE = 'FEE',
  MINT = 'MINT',
  BURN = 'BURN',
}

registerEnumType(TransactionTypeEnum, {
  name: 'TransactionTypeEnum',
});

@ObjectType()
export class TransactionType {
  @Field()
  id!: string;

  @Field()
  from!: string;

  @Field()
  to!: string;

  @Field()
  amount!: string;

  @Field()
  fee!: string;

  @Field(() => Int)
  timestamp!: number;

  @Field(() => TransactionTypeEnum)
  type!: TransactionTypeEnum;

  @Field(() => GraphQLJSON, { nullable: true })
  data?: any;

  @Field()
  signature!: string;

  @Field(() => Int)
  nonce!: number;

  @Field({ nullable: true })
  blockHash?: string;

  @Field(() => Int, { nullable: true })
  blockHeight?: number;

  @Field(() => Int, { nullable: true })
  confirmations?: number;

  @Field(() => Boolean, { nullable: true })
  isConfirmed?: boolean;
}
