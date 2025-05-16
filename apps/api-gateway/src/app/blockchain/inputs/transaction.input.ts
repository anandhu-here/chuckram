// apps/api-gateway/src/app/blockchain/inputs/transaction.input.ts

import { InputType, Field, Int } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';
import { TransactionTypeEnum } from '../types/transaction.type';

@InputType()
export class TransactionInput {
  @Field()
  from!: string;

  @Field()
  to!: string;

  @Field()
  amount!: string;

  @Field()
  fee!: string;

  @Field(() => TransactionTypeEnum)
  type!: TransactionTypeEnum;

  @Field(() => Int)
  nonce!: number;

  @Field()
  signature!: string;

  @Field(() => GraphQLJSON, { nullable: true })
  data?: Record<string, any>;
}
