// apps/api-gateway/src/app/blockchain/dto/create-transaction.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsInt,
} from 'class-validator';

export enum TransactionType {
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

export class CreateTransactionDto {
  @ApiProperty({
    description: 'The sender address',
    example: '0x1234567890abcdef1234567890abcdef12345678',
  })
  @IsNotEmpty()
  @IsString()
  from!: string;

  @ApiProperty({
    description: 'The recipient address',
    example: '0xabcdef1234567890abcdef1234567890abcdef12',
  })
  @IsNotEmpty()
  @IsString()
  to!: string;

  @ApiProperty({
    description: 'The transaction amount in smallest unit (Cash)',
    example: '10000',
  })
  @IsNotEmpty()
  @IsString()
  amount!: string;

  @ApiProperty({
    description: 'The transaction fee in smallest unit (Cash)',
    example: '16',
  })
  @IsNotEmpty()
  @IsString()
  fee!: string;

  @ApiProperty({
    description: 'The transaction type',
    enum: TransactionType,
    example: TransactionType.TRANSFER,
  })
  @IsNotEmpty()
  @IsEnum(TransactionType)
  type!: TransactionType;

  @ApiProperty({
    description: 'Transaction nonce (to prevent replay attacks)',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  nonce!: number;

  @ApiProperty({
    description: 'Transaction signature by the sender',
    example:
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  })
  @IsNotEmpty()
  @IsString()
  signature!: string;

  @ApiProperty({
    description: 'Additional data for the transaction',
    example: { proposalId: '123', vote: true },
    required: false,
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}
