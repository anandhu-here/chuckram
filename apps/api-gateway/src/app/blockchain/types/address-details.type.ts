// apps/api-gateway/src/app/blockchain/types/address-details.type.ts

import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class AddressDetailsType {
  @Field()
  address!: string;

  @Field()
  balance!: string;

  @Field(() => Int)
  txCount!: number;

  @Field({ nullable: true })
  did?: string;

  @Field(() => Boolean, { nullable: true })
  isValidator?: boolean;

  @Field(() => Int, { nullable: true })
  firstSeen?: number;

  @Field(() => Int, { nullable: true })
  lastSeen?: number;
}
