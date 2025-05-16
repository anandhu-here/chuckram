// apps/api-gateway/src/app/blockchain/blockchain.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  ParseIntPipe,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { BlockchainService } from './blockchain.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@ApiTags('blockchain')
@Controller('blockchain')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BlockchainController {
  constructor(private readonly blockchainService: BlockchainService) {}

  @Public()
  @Get('info')
  @ApiOperation({ summary: 'Get blockchain info' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Blockchain info retrieved successfully',
  })
  getBlockchainInfo() {
    return this.blockchainService.getBlockchainInfo();
  }

  @Public()
  @Get('blocks/latest')
  @ApiOperation({ summary: 'Get latest blocks' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of blocks to retrieve',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Latest blocks retrieved successfully',
  })
  getLatestBlocks(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number
  ) {
    return this.blockchainService.getLatestBlocks(limit);
  }

  @Public()
  @Get('blocks/:height')
  @ApiOperation({ summary: 'Get block by height' })
  @ApiParam({ name: 'height', type: Number, description: 'Block height' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Block retrieved successfully',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Block not found' })
  getBlockByHeight(@Param('height', ParseIntPipe) height: number) {
    return this.blockchainService.getBlockByHeight(height);
  }

  @Public()
  @Get('blocks/hash/:hash')
  @ApiOperation({ summary: 'Get block by hash' })
  @ApiParam({ name: 'hash', type: String, description: 'Block hash' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Block retrieved successfully',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Block not found' })
  getBlockByHash(@Param('hash') hash: string) {
    return this.blockchainService.getBlockByHash(hash);
  }

  @Public()
  @Get('transactions/:id')
  @ApiOperation({ summary: 'Get transaction by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Transaction ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transaction retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Transaction not found',
  })
  getTransaction(@Param('id') id: string) {
    return this.blockchainService.getTransaction(id);
  }

  @Post('transactions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create transaction' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Transaction created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid transaction data',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  createTransaction(
    @Body(ValidationPipe) createTransactionDto: CreateTransactionDto
  ) {
    return this.blockchainService.createTransaction(createTransactionDto);
  }

  @Public()
  @Get('addresses/:address')
  @ApiOperation({ summary: 'Get address details' })
  @ApiParam({
    name: 'address',
    type: String,
    description: 'Blockchain address',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Address details retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Address not found',
  })
  getAddressDetails(@Param('address') address: string) {
    return this.blockchainService.getAddressDetails(address);
  }

  @Public()
  @Get('addresses/:address/transactions')
  @ApiOperation({ summary: 'Get address transactions' })
  @ApiParam({
    name: 'address',
    type: String,
    description: 'Blockchain address',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of transactions to retrieve',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Offset for pagination',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Address transactions retrieved successfully',
  })
  getAddressTransactions(
    @Param('address') address: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number
  ) {
    return this.blockchainService.getAddressTransactions(
      address,
      limit,
      offset
    );
  }

  @Public()
  @Get('addresses/:address/balance')
  @ApiOperation({ summary: 'Get address balance' })
  @ApiParam({
    name: 'address',
    type: String,
    description: 'Blockchain address',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Address balance retrieved successfully',
  })
  getAddressBalance(@Param('address') address: string) {
    return this.blockchainService.getAddressBalance(address);
  }

  @Public()
  @Get('validators')
  @ApiOperation({ summary: 'Get all validators' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Validators retrieved successfully',
  })
  getValidators() {
    return this.blockchainService.getValidators();
  }

  @Public()
  @Get('validators/:address')
  @ApiOperation({ summary: 'Get validator details' })
  @ApiParam({ name: 'address', type: String, description: 'Validator address' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Validator details retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Validator not found',
  })
  getValidatorDetails(@Param('address') address: string) {
    return this.blockchainService.getValidatorDetails(address);
  }

  @Public()
  @Get('mempool')
  @ApiOperation({ summary: 'Get mempool transactions' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of transactions to retrieve',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Offset for pagination',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Mempool transactions retrieved successfully',
  })
  getMempoolTransactions(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number
  ) {
    return this.blockchainService.getMempoolTransactions(limit, offset);
  }

  @Public()
  @Get('stats')
  @ApiOperation({ summary: 'Get network statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Network statistics retrieved successfully',
  })
  getNetworkStats() {
    return this.blockchainService.getNetworkStats();
  }

  @Get('admin/status')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get blockchain status (admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Blockchain status retrieved successfully',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden' })
  getBlockchainStatus() {
    // This endpoint is protected by RolesGuard and requires 'admin' role
    return this.blockchainService.getBlockchainInfo();
  }
}
