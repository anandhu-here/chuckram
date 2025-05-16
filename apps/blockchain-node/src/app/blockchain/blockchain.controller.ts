// apps/blockchain-node/src/app/blockchain/blockchain.controller.ts

import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiKeyGuard } from '../api/guards/api-key.guard';
import { BlockchainService } from './blockchain.service';
import { StateManager } from './state-manager.service';

@Controller('blockchain')
@UseGuards(ApiKeyGuard)
export class BlockchainController {
  constructor(
    private readonly blockchainService: BlockchainService,
    private readonly stateManager: StateManager
  ) {}

  @Get('info')
  getBlockchainInfo() {
    return {
      ...this.blockchainService.getBlockchainState(),
      ...this.stateManager.getStateInfo(),
    };
  }

  @Get('blocks/latest')
  getLatestBlocks(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number
  ) {
    return this.blockchainService.getLatestBlocks(limit);
  }

  @Get('blocks/:height')
  getBlockByHeight(@Param('height', ParseIntPipe) height: number) {
    const block = this.blockchainService.getBlockByHeight(height);

    if (!block) {
      throw new NotFoundException(`Block at height ${height} not found`);
    }

    return block;
  }

  @Get('blocks/hash/:hash')
  getBlockByHash(@Param('hash') hash: string) {
    const block = this.blockchainService.getBlock(hash);

    if (!block) {
      throw new NotFoundException(`Block with hash ${hash} not found`);
    }

    return block;
  }

  @Get('blocks')
  getBlockRange(
    @Query('start', ParseIntPipe) start: number,
    @Query('end', ParseIntPipe) end: number
  ) {
    if (end < start) {
      throw new BadRequestException(
        'End height must be greater than or equal to start height'
      );
    }

    if (end - start > 100) {
      throw new BadRequestException(
        'Cannot request more than 100 blocks at once'
      );
    }

    return this.blockchainService.getBlockRange(start, end);
  }

  @Get('transactions/:id')
  getTransaction(@Param('id') id: string) {
    const result = this.blockchainService.getTransaction(id);

    if (!result) {
      throw new NotFoundException(`Transaction ${id} not found`);
    }

    return result;
  }

  @Get('address/:address')
  getAddressInfo(@Param('address') address: string) {
    const balance = this.stateManager.getBalance(address);
    const nonce = this.stateManager.getNonce(address);
    const isValidator = !!this.stateManager.getValidator(address);

    return {
      address,
      balance: balance.toString(),
      nonce,
      isValidator,
    };
  }

  @Get('address/:address/balance')
  getAddressBalance(@Param('address') address: string) {
    const balance = this.stateManager.getBalance(address);

    return {
      address,
      balance: balance.toString(),
    };
  }

  @Get('address/:address/transactions')
  getAddressTransactions(
    @Param('address') address: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number
  ) {
    return this.blockchainService.getAddressTransactions(address, limit);
  }

  @Get('validators')
  getValidators() {
    return this.stateManager.getValidators();
  }

  @Get('validators/:address')
  getValidator(@Param('address') address: string) {
    const validator = this.stateManager.getValidator(address);

    if (!validator) {
      throw new NotFoundException(`Validator ${address} not found`);
    }

    return validator;
  }

  @Get('supply')
  getTotalSupply() {
    const totalSupply = this.stateManager.getTotalSupply();

    return {
      totalSupply: totalSupply.toString(),
    };
  }

  @Get('stats')
  getBlockchainStats() {
    return {
      blockHeight: this.blockchainService.getChainHeight(),
      blockCount: this.blockchainService.getBlockCount(),
      transactionCount: this.blockchainService.getTransactionCount(),
      accountCount: this.stateManager.getStateInfo().accountCount,
      validatorCount: this.stateManager.getStateInfo().validatorCount,
      totalSupply: this.stateManager.getTotalSupply().toString(),
    };
  }

  @Post('blocks')
  async addBlock(@Body() block: any) {
    try {
      const success = await this.blockchainService.addBlock(block);

      return {
        success,
        message: success ? 'Block added successfully' : 'Block already exists',
      };
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }
}
