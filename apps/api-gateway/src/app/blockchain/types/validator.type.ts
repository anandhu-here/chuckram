// apps/api-gateway/src/app/blockchain/types/validator.type.ts

import { ObjectType, Field, Int, registerEnumType } from '@nestjs/graphql';

export enum ValidatorTypeEnum {
  GOVERNMENT = 'GOVERNMENT',
  CITIZEN = 'CITIZEN',
}

registerEnumType(ValidatorTypeEnum, {
  name: 'ValidatorTypeEnum',
});

@ObjectType()
export class ValidatorType {
  @Field()
  address!: string;

  @Field(() => ValidatorTypeEnum)
  type!: ValidatorTypeEnum;

  @Field({ nullable: true })
  stake?: string;

  @Field(() => Boolean)
  active!: boolean;

  @Field(() => Int)
  registeredAt!: number;

  @Field(() => Int)
  lastActiveBlock!: number;

  @Field(() => Int, { nullable: true })
  proposedBlocks?: number;

  @Field(() => Int, { nullable: true })
  votingPower?: number;

  @Field(() => Int, { nullable: true })
  uptimePercentage?: number;
}
