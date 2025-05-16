// apps/api-gateway/src/app/websocket/websocket.gateway.ts

import * as websockets from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth/auth.service';
import { WsJwtGuard } from './guards/ws-jwt.guard';

@websockets.WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class WebsocketGateway
  implements
    websockets.OnGatewayInit,
    websockets.OnGatewayConnection,
    websockets.OnGatewayDisconnect
{
  @websockets.WebSocketServer()
  server: Server | undefined;

  private readonly logger = new Logger(WebsocketGateway.name);
  private clientCount = 0;
  private subscribedAddresses = new Map<string, Set<string>>();
  private subscribedTransactions = new Map<string, Set<string>>();
  private subscribedBlocks = new Set<string>();

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService
  ) {}

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.clientCount++;
    this.logger.log(
      `Client connected: ${client.id}, total clients: ${this.clientCount}`
    );
  }

  handleDisconnect(client: Socket) {
    this.clientCount--;
    this.logger.log(
      `Client disconnected: ${client.id}, total clients: ${this.clientCount}`
    );

    // Remove client subscriptions
    this.removeClientSubscriptions(client.id);
  }

  @UseGuards(WsJwtGuard)
  @websockets.SubscribeMessage('subscribe_address')
  handleSubscribeAddress(
    client: Socket,
    address: string
  ): websockets.WsResponse<{ success: boolean }> {
    this.addSubscription(this.subscribedAddresses, address, client.id);
    this.logger.log(`Client ${client.id} subscribed to address: ${address}`);
    return { event: 'subscribe_address', data: { success: true } };
  }

  @UseGuards(WsJwtGuard)
  @websockets.SubscribeMessage('unsubscribe_address')
  handleUnsubscribeAddress(
    client: Socket,
    address: string
  ): websockets.WsResponse<{ success: boolean }> {
    this.removeSubscription(this.subscribedAddresses, address, client.id);
    this.logger.log(
      `Client ${client.id} unsubscribed from address: ${address}`
    );
    return { event: 'unsubscribe_address', data: { success: true } };
  }

  @websockets.SubscribeMessage('subscribe_transaction')
  handleSubscribeTransaction(
    client: Socket,
    txId: string
  ): websockets.WsResponse<{ success: boolean }> {
    this.addSubscription(this.subscribedTransactions, txId, client.id);
    this.logger.log(`Client ${client.id} subscribed to transaction: ${txId}`);
    return { event: 'subscribe_transaction', data: { success: true } };
  }

  @websockets.SubscribeMessage('unsubscribe_transaction')
  handleUnsubscribeTransaction(
    client: Socket,
    txId: string
  ): websockets.WsResponse<{ success: boolean }> {
    this.removeSubscription(this.subscribedTransactions, txId, client.id);
    this.logger.log(
      `Client ${client.id} unsubscribed from transaction: ${txId}`
    );
    return { event: 'unsubscribe_transaction', data: { success: true } };
  }

  @websockets.SubscribeMessage('subscribe_blocks')
  handleSubscribeBlocks(
    client: Socket
  ): websockets.WsResponse<{ success: boolean }> {
    this.subscribedBlocks.add(client.id);
    this.logger.log(`Client ${client.id} subscribed to blocks`);
    return { event: 'subscribe_blocks', data: { success: true } };
  }

  @websockets.SubscribeMessage('unsubscribe_blocks')
  handleUnsubscribeBlocks(
    client: Socket
  ): websockets.WsResponse<{ success: boolean }> {
    this.subscribedBlocks.delete(client.id);
    this.logger.log(`Client ${client.id} unsubscribed from blocks`);
    return { event: 'unsubscribe_blocks', data: { success: true } };
  }

  // Methods to be called from other services
  notifyNewBlock(block: any) {
    // Notify all clients subscribed to blocks
    if (this.server) {
      this.server
        .to(Array.from(this.subscribedBlocks))
        .emit('new_block', block);
    }

    // Notify clients subscribed to addresses in this block
    const addressesInBlock = new Set<string>();
    for (const tx of block.transactions) {
      addressesInBlock.add(tx.from);
      addressesInBlock.add(tx.to);

      // Notify clients subscribed to transactions in this block
      const txSubscribers = this.subscribedTransactions.get(tx.id);
      if (txSubscribers) {
        if (this.server) {
          this.server
            .to(Array.from(txSubscribers))
            .emit('transaction_confirmed', {
              txId: tx.id,
              blockHeight: block.header.height,
              blockHash: block.hash,
            });
        }
      }
    }

    // Notify clients subscribed to addresses
    for (const address of addressesInBlock) {
      const addressSubscribers = this.subscribedAddresses.get(address);
      if (addressSubscribers) {
        if (this.server) {
          this.server
            .to(Array.from(addressSubscribers))
            .emit('address_activity', {
              address,
              blockHeight: block.header.height,
              blockHash: block.hash,
            });
        }
      }
    }
  }

  notifyNewTransaction(transaction: any) {
    // Notify clients subscribed to addresses in this transaction
    const addresses = [transaction.from, transaction.to];
    for (const address of addresses) {
      const addressSubscribers = this.subscribedAddresses.get(address);
      if (addressSubscribers && this.server) {
        this.server.to(Array.from(addressSubscribers)).emit('new_transaction', {
          txId: transaction.id,
          from: transaction.from,
          to: transaction.to,
          amount: transaction.amount,
        });
      }
    }

    // Notify clients subscribed to this specific transaction
    const txSubscribers = this.subscribedTransactions.get(transaction.id);
    if (txSubscribers && this.server) {
      this.server
        .to(Array.from(txSubscribers))
        .emit('transaction_update', transaction);
    }
  }

  // Helper methods for subscription management
  private addSubscription(
    subscriptionMap: Map<string, Set<string>>,
    key: string,
    clientId: string
  ) {
    if (!subscriptionMap.has(key)) {
      subscriptionMap.set(key, new Set());
    }
    subscriptionMap.get(key)!.add(clientId);
  }

  private removeSubscription(
    subscriptionMap: Map<string, Set<string>>,
    key: string,
    clientId: string
  ) {
    if (subscriptionMap.has(key)) {
      const clients = subscriptionMap.get(key);
      clients?.delete(clientId);
      if (clients?.size === 0) {
        subscriptionMap.delete(key);
      }
    }
  }

  private removeClientSubscriptions(clientId: string) {
    // Remove from address subscriptions
    for (const [address, clients] of this.subscribedAddresses.entries()) {
      clients.delete(clientId);
      if (clients.size === 0) {
        this.subscribedAddresses.delete(address);
      }
    }

    // Remove from transaction subscriptions
    for (const [txId, clients] of this.subscribedTransactions.entries()) {
      clients.delete(clientId);
      if (clients.size === 0) {
        this.subscribedTransactions.delete(txId);
      }
    }

    // Remove from block subscriptions
    this.subscribedBlocks.delete(clientId);
  }
}
