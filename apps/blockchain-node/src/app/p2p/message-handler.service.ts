// apps/blockchain-node/src/app/p2p/message-handler.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class MessageHandler {
  private readonly logger = new Logger(MessageHandler.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  // Handle incoming block message
  async handleBlock(block: any, peerId: string): Promise<void> {
    this.logger.debug(
      `Processing block message from peer ${peerId}: ${block.hash}`
    );

    // Validate the block
    // In a real implementation, we would validate the block's integrity
    // and consensus rules

    // Emit event for blockchain service to process
    this.eventEmitter.emit('blockchain.block.received', { block, peerId });
  }

  // Handle incoming transaction message
  async handleTransaction(transaction: any, peerId: string): Promise<void> {
    this.logger.debug(
      `Processing transaction message from peer ${peerId}: ${transaction.id}`
    );

    // Validate the transaction
    // In a real implementation, we would validate the transaction's integrity
    // and ensure it meets basic requirements

    // Emit event for mempool service to process
    this.eventEmitter.emit('mempool.transaction.received', {
      transaction,
      peerId,
    });
  }

  // Handle peer discovery message
  async handlePeerDiscovery(peers: string[], peerId: string): Promise<void> {
    this.logger.debug(`Received ${peers.length} peer addresses from ${peerId}`);

    // Emit event for P2P service to process
    this.eventEmitter.emit('p2p.peers.discovered', { peers, peerId });
  }

  // Handle sync request message
  async handleSyncRequest(request: any, peerId: string): Promise<void> {
    this.logger.debug(
      `Received sync request from ${peerId} for heights ${request.fromHeight} to ${request.toHeight}`
    );

    // Emit event for sync service to process
    this.eventEmitter.emit('sync.request.received', { request, peerId });
  }

  // Handle sync response message
  async handleSyncResponse(response: any, peerId: string): Promise<void> {
    this.logger.debug(
      `Received sync response from ${peerId} with ${
        response.blocks?.length || 0
      } blocks`
    );

    // Emit event for sync service to process
    this.eventEmitter.emit('sync.response.received', { response, peerId });
  }

  // Handle ping message
  async handlePing(ping: any, peerId: string): Promise<void> {
    this.logger.debug(`Received ping from ${peerId}`);

    // Emit event to send pong response
    this.eventEmitter.emit('p2p.ping.received', { ping, peerId });
  }

  // Handle pong message
  async handlePong(pong: any, peerId: string): Promise<void> {
    this.logger.debug(`Received pong from ${peerId}`);

    // Calculate latency
    const latency = Date.now() - pong.timestamp;

    // Emit event to update peer latency
    this.eventEmitter.emit('p2p.pong.received', { pong, peerId, latency });
  }

  // Handle generic message (router function)
  async handleMessage(message: any, peerId: string): Promise<void> {
    if (!message || !message.type) {
      this.logger.warn(`Received invalid message from ${peerId}`);
      return;
    }

    this.logger.debug(
      `Received message of type ${message.type} from ${peerId}`
    );

    // Route to appropriate handler based on message type
    switch (message.type) {
      case 'block':
        await this.handleBlock(message.payload, peerId);
        break;
      case 'transaction':
        await this.handleTransaction(message.payload, peerId);
        break;
      case 'peers':
        await this.handlePeerDiscovery(message.payload, peerId);
        break;
      case 'sync_request':
        await this.handleSyncRequest(message.payload, peerId);
        break;
      case 'sync_response':
        await this.handleSyncResponse(message.payload, peerId);
        break;
      case 'ping':
        await this.handlePing(message.payload, peerId);
        break;
      case 'pong':
        await this.handlePong(message.payload, peerId);
        break;
      default:
        this.logger.warn(`Unknown message type ${message.type} from ${peerId}`);
    }
  }
}
