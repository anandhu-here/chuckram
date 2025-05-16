// apps/blockchain-node/src/app/mempool/mempool.controller.ts

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
  ParseIntPipe,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiKeyGuard } from '../api/guards/api-key.guard';
import { MempoolService } from './mempool.service';

@Controller('mempool')
@UseGuards(ApiKeyGuard)
export class MempoolController {
  constructor(private readonly mempoolService: MempoolService) {}

  @Get()
  getMempool(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number
  ) {
    const transactions = this.mempoolService.getAllTransactions();

    if (limit && limit > 0) {
      return transactions.slice(0, limit);
    }

    return transactions;
  }

  @Get('stats')
  getMempoolStats() {
    return this.mempoolService.getStats();
  }

  @Get('count')
  getMempoolCount() {
    return { count: this.mempoolService.getPendingCount() };
  }

  @Get('transactions/:id')
  getTransaction(@Param('id') id: string) {
    const transaction = this.mempoolService.getTransaction(id);

    if (!transaction) {
      throw new NotFoundException(`Transaction ${id} not found in mempool`);
    }

    return transaction;
  }

  @Get('address/:address')
  getTransactionsByAddress(@Param('address') address: string) {
    const txIds = Array.from(
      this.mempoolService.getTransactionsByAccount(address)
    );
    const transactions = txIds.map((id) =>
      this.mempoolService.getTransaction(id)
    );

    return transactions;
  }

  @Post('transactions')
  async addTransaction(@Body() transaction: any) {
    if (
      !transaction.id ||
      !transaction.from ||
      !transaction.to ||
      !transaction.amount ||
      !transaction.signature
    ) {
      throw new BadRequestException('Invalid transaction format');
    }

    try {
      const success = await this.mempoolService.addTransaction(transaction);
      return {
        success,
        message: success
          ? 'Transaction added to mempool'
          : 'Transaction already in mempool',
      };
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete('transactions/:id')
  removeTransaction(@Param('id') id: string) {
    const success = this.mempoolService.removeTransaction(id);

    if (!success) {
      throw new NotFoundException(`Transaction ${id} not found in mempool`);
    }

    return { success, message: 'Transaction removed from mempool' };
  }

  @Delete()
  clearMempool() {
    const count = this.mempoolService.clear();
    return {
      success: true,
      count,
      message: `Cleared ${count} transactions from mempool`,
    };
  }

  @Get('for-block')
  getTransactionsForBlock(
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 1000
  ) {
    return this.mempoolService.getTransactionsForBlock(limit);
  }
}
