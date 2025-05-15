import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { Server as WebSocketServer } from 'ws';
import {
  Peer,
  NetworkConfig,
  NetworkMessage,
  MessageType,
  HandshakePayload,
  BlockAnnouncementPayload,
  PeerDiscoveryPayload,
} from '@digital-chuckram/types';
import { Block, Transaction } from '@digital-chuckram/types';
import { CryptoUtils } from '@digital-chuckram/crypto';

export class P2PNetwork extends EventEmitter {
  private config: NetworkConfig;
  private peers: Map<string, Peer> = new Map();
  private connections: Map<string, WebSocket> = new Map();
  private server?: WebSocketServer;
  private nodeId: string;
  private privateKey: string;

  constructor(config: NetworkConfig, privateKey: string) {
    super();
    this.config = config;
    this.privateKey = privateKey;
    this.nodeId = CryptoUtils.generateKeyPair().address; // Generate unique node ID
  }

  async start(): Promise<void> {
    // Start WebSocket server
    this.server = new WebSocketServer({ port: this.config.port });

    this.server.on('connection', (ws: WebSocket, req) => {
      this.handleConnection(ws, req.socket.remoteAddress || '');
    });

    this.server.on('listening', () => {
      console.log(`P2P server listening on port ${this.config.port}`);
    });

    // Connect to seed peers
    await this.connectToSeedPeers();

    // Start periodic tasks
    this.startPeriodicTasks();
  }

  private async connectToSeedPeers(): Promise<void> {
    for (const seedPeer of this.config.seedPeers) {
      await this.connectToPeer(seedPeer);
    }
  }

  private async connectToPeer(peer: Peer): Promise<void> {
    if (this.connections.has(peer.id)) {
      return; // Already connected
    }

    try {
      const ws = new WebSocket(`ws://${peer.address}:${peer.port}`);

      ws.on('open', () => {
        console.log(`Connected to peer ${peer.id}`);
        this.connections.set(peer.id, ws);
        this.setupMessageHandlers(ws, peer.id);
        this.sendHandshake(ws);
      });

      ws.on('error', (error: any) => {
        console.error(`Error connecting to peer ${peer.id}:`, error);
      });

      ws.on('close', () => {
        this.handlePeerDisconnect(peer.id);
      });
    } catch (error) {
      console.error(`Failed to connect to peer ${peer.id}:`, error);
    }
  }

  private handleConnection(ws: WebSocket, remoteAddress: string): void {
    const tempPeerId = `temp_${Date.now()}`;
    console.log(`New connection from ${remoteAddress}`);

    this.setupMessageHandlers(ws, tempPeerId);
  }

  private setupMessageHandlers(ws: WebSocket, peerId: string): void {
    ws.on('message', (data: Buffer) => {
      try {
        const message: NetworkMessage = JSON.parse(data.toString());
        this.handleMessage(message, peerId, ws);
      } catch (error) {
        console.error('Invalid message received:', error);
      }
    });

    ws.on('close', () => {
      this.handlePeerDisconnect(peerId);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for peer ${peerId}:`, error);
    });
  }

  private handleMessage(
    message: NetworkMessage,
    peerId: string,
    ws: WebSocket
  ): void {
    switch (message.type) {
      case MessageType.HANDSHAKE:
        this.handleHandshake(message.payload, peerId, ws);
        break;
      case MessageType.BLOCK_ANNOUNCEMENT:
        this.handleBlockAnnouncement(message.payload);
        break;
      case MessageType.TRANSACTION_ANNOUNCEMENT:
        this.emit('transaction', message.payload);
        break;
      case MessageType.PEER_DISCOVERY:
        this.handlePeerDiscovery(message.payload, ws);
        break;
      case MessageType.CONSENSUS_MESSAGE:
        this.emit('consensus-message', message.payload);
        break;
      case MessageType.PING:
        this.sendPong(ws);
        break;
      case MessageType.PONG:
        // Update last seen time
        const peer = this.peers.get(peerId);
        if (peer) {
          peer.lastSeen = Date.now();
        }
        break;
    }
  }

  private handleHandshake(
    payload: HandshakePayload,
    tempPeerId: string,
    ws: WebSocket
  ): void {
    // Validate handshake
    if (payload.networkId !== this.config.networkId) {
      ws.close(1002, 'Invalid network ID');
      return;
    }

    // Update peer information
    const peer: Peer = {
      id: payload.peerId,
      address: ws.url || '',
      port: this.config.port, // Default port
      lastSeen: Date.now(),
      version: payload.version,
      chainHeight: payload.chainHeight,
    };

    // Replace temporary peer ID with actual peer ID
    this.peers.delete(tempPeerId);
    this.peers.set(peer.id, peer);

    if (this.connections.has(tempPeerId)) {
      const connection = this.connections.get(tempPeerId)!;
      this.connections.delete(tempPeerId);
      this.connections.set(peer.id, connection);
    }

    // Send our handshake if we haven't already
    if (!ws.url) {
      // This is an incoming connection
      this.sendHandshake(ws);
    }

    // Request peer list
    this.requestPeerDiscovery(ws);
  }

  private handleBlockAnnouncement(payload: BlockAnnouncementPayload): void {
    this.emit('block-announcement', payload);
  }

  private handlePeerDiscovery(
    payload: PeerDiscoveryPayload,
    ws: WebSocket
  ): void {
    // Add new peers
    for (const peer of payload.peers) {
      if (!this.peers.has(peer.id) && peer.id !== this.nodeId) {
        this.peers.set(peer.id, peer);
        // Try to connect to new peers
        this.connectToPeer(peer);
      }
    }
  }

  private sendHandshake(ws: WebSocket): void {
    const handshake: HandshakePayload = {
      version: this.config.version,
      networkId: this.config.networkId,
      chainHeight: 0, // Will be updated by blockchain
      peerId: this.nodeId,
    };

    this.sendMessage(ws, MessageType.HANDSHAKE, handshake);
  }

  private sendPong(ws: WebSocket): void {
    this.sendMessage(ws, MessageType.PONG, {});
  }

  private requestPeerDiscovery(ws: WebSocket): void {
    this.sendMessage(ws, MessageType.PEER_DISCOVERY, {});
  }

  private sendMessage(ws: WebSocket, type: MessageType, payload: any): void {
    const message: NetworkMessage = {
      type,
      payload,
      from: this.nodeId,
      timestamp: Date.now(),
    };

    // Sign message if needed
    if (type !== MessageType.PING && type !== MessageType.PONG) {
      message.signature = CryptoUtils.sign(
        this.privateKey,
        JSON.stringify({
          type,
          payload,
          from: message.from,
          timestamp: message.timestamp,
        })
      );
    }

    ws.send(JSON.stringify(message));
  }

  private handlePeerDisconnect(peerId: string): void {
    console.log(`Peer ${peerId} disconnected`);
    this.peers.delete(peerId);
    this.connections.delete(peerId);
  }

  private startPeriodicTasks(): void {
    // Ping peers every 30 seconds
    setInterval(() => {
      this.pingPeers();
    }, 30000);

    // Clean up stale peers every minute
    setInterval(() => {
      this.cleanupStalePeers();
    }, 60000);

    // Discover new peers every 5 minutes
    setInterval(() => {
      this.discoverPeers();
    }, 300000);
  }

  private pingPeers(): void {
    for (const [peerId, connection] of this.connections) {
      this.sendMessage(connection, MessageType.PING, {});
    }
  }

  private cleanupStalePeers(): void {
    const now = Date.now();
    const staleTimeout = 120000; // 2 minutes

    for (const [peerId, peer] of this.peers) {
      if (now - peer.lastSeen > staleTimeout) {
        this.handlePeerDisconnect(peerId);
      }
    }
  }

  private discoverPeers(): void {
    for (const connection of this.connections.values()) {
      this.requestPeerDiscovery(connection);
    }
  }

  // Public methods
  broadcastBlock(block: Block): void {
    const announcement: BlockAnnouncementPayload = {
      blockHash: block.hash,
      blockHeight: block.header.height,
      previousHash: block.header.previousHash,
    };

    this.broadcast(MessageType.BLOCK_ANNOUNCEMENT, announcement);
  }

  broadcastTransaction(transaction: Transaction): void {
    this.broadcast(MessageType.TRANSACTION_ANNOUNCEMENT, transaction);
  }

  broadcastConsensusMessage(message: any): void {
    this.broadcast(MessageType.CONSENSUS_MESSAGE, message);
  }

  private broadcast(type: MessageType, payload: any): void {
    for (const connection of this.connections.values()) {
      this.sendMessage(connection, type, payload);
    }
  }

  getPeers(): Peer[] {
    return Array.from(this.peers.values());
  }

  async stop(): Promise<void> {
    // Close all connections
    for (const connection of this.connections.values()) {
      connection.close();
    }

    // Close server
    if (this.server) {
      this.server.close();
    }

    this.removeAllListeners();
  }
}
