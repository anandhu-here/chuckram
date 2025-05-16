// apps/api-gateway/src/app/blockchain/blockchain.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { HttpService } from '@nestjs/axios';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);

  constructor(private readonly httpService: HttpService) {}

  /**
   * Get blockchain info
   */
  getBlockchainInfo(): Observable<any> {
    return this.httpService.get('/info').pipe(
      map((response: any) => response.data),
      catchError((error) => {
        this.logger.error(`Failed to get blockchain info: ${error.message}`);
        return throwError(error);
      })
    );
  }

  /**
   * Get block by height
   */
  getBlockByHeight(height: number): Observable<any> {
    return this.httpService.get(`/blocks/${height}`).pipe(
      map((response: any) => response.data),
      catchError((error) => {
        this.logger.error(
          `Failed to get block at height ${height}: ${error.message}`
        );
        return throwError(error);
      })
    );
  }

  /**
   * Get block by hash
   */
  getBlockByHash(hash: string): Observable<any> {
    return this.httpService.get(`/blocks/hash/${hash}`).pipe(
      map((response: any) => response.data),
      catchError((error) => {
        this.logger.error(
          `Failed to get block with hash ${hash}: ${error.message}`
        );
        return throwError(error);
      })
    );
  }

  /**
   * Get latest blocks
   */
  getLatestBlocks(limit: number = 10): Observable<any> {
    return this.httpService.get(`/blocks/latest?limit=${limit}`).pipe(
      map((response: any) => response.data),
      catchError((error) => {
        this.logger.error(`Failed to get latest blocks: ${error.message}`);
        return throwError(error);
      })
    );
  }

  /**
   * Get transaction by ID
   */
  getTransaction(id: string): Observable<any> {
    return this.httpService.get(`/transactions/${id}`).pipe(
      map((response: any) => response.data),
      catchError((error) => {
        this.logger.error(`Failed to get transaction ${id}: ${error.message}`);
        return throwError(error);
      })
    );
  }

  /**
   * Create transaction
   */
  createTransaction(transactionData: CreateTransactionDto): Observable<any> {
    return this.httpService.post('/transactions', transactionData).pipe(
      map((response: any) => response.data),
      catchError((error) => {
        this.logger.error(`Failed to create transaction: ${error.message}`);
        return throwError(error);
      })
    );
  }

  /**
   * Get address details
   */
  getAddressDetails(address: string): Observable<any> {
    return this.httpService.get(`/addresses/${address}`).pipe(
      map((response: any) => response.data),
      catchError((error) => {
        this.logger.error(
          `Failed to get address details for ${address}: ${error.message}`
        );
        return throwError(error);
      })
    );
  }

  /**
   * Get address transactions
   */
  getAddressTransactions(
    address: string,
    limit: number = 10,
    offset: number = 0
  ): Observable<any> {
    return this.httpService
      .get(`/addresses/${address}/transactions?limit=${limit}&offset=${offset}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => {
          this.logger.error(
            `Failed to get transactions for address ${address}: ${error.message}`
          );
          return throwError(error);
        })
      );
  }

  /**
   * Get address balance
   */
  getAddressBalance(address: string): Observable<any> {
    return this.httpService.get(`/addresses/${address}/balance`).pipe(
      map((response: any) => response.data),
      catchError((error) => {
        this.logger.error(
          `Failed to get balance for address ${address}: ${error.message}`
        );
        return throwError(error);
      })
    );
  }

  /**
   * Get validators
   */
  getValidators(): Observable<any> {
    return this.httpService.get('/validators').pipe(
      map((response: any) => response.data),
      catchError((error) => {
        this.logger.error(`Failed to get validators: ${error.message}`);
        return throwError(error);
      })
    );
  }

  /**
   * Get validator details
   */
  getValidatorDetails(address: string): Observable<any> {
    return this.httpService.get(`/validators/${address}`).pipe(
      map((response: any) => response.data),
      catchError((error) => {
        this.logger.error(
          `Failed to get validator details for ${address}: ${error.message}`
        );
        return throwError(error);
      })
    );
  }

  /**
   * Get mempool transactions
   */
  getMempoolTransactions(
    limit: number = 10,
    offset: number = 0
  ): Observable<any> {
    return this.httpService
      .get(`/mempool?limit=${limit}&offset=${offset}`)
      .pipe(
        map((response: any) => response.data),
        catchError((error) => {
          this.logger.error(
            `Failed to get mempool transactions: ${error.message}`
          );
          return throwError(error);
        })
      );
  }

  /**
   * Get network statistics
   */
  getNetworkStats(): Observable<any> {
    return this.httpService.get('/stats').pipe(
      map((response: any) => response.data),
      catchError((error) => {
        this.logger.error(`Failed to get network stats: ${error.message}`);
        return throwError(error);
      })
    );
  }
}
