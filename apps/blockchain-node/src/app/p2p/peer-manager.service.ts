// apps/blockchain-node/src/app/p2p/peer-manager.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';

export interface Peer {
  id: string;
  address: string;
  port: number;
  version: string;
  connected: boolean;
  lastSeen: number;
  connectionTime: number;
  blockHeight?: number;
  latency?: number;
}

@Injectable()
export class PeerManager {
  private readonly logger = new Logger(PeerManager.name);
  private peers: Map<string, Peer> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  // Add a new peer
  async addPeer(peerAddress: string): Promise<any> {
    // Parse address and port from peer string
    const [address, portStr] = peerAddress.split(':');
    const port = parseInt(portStr || '40000', 10);

    // Generate a unique ID for this peer
    const id = `${address}:${port}`;

    // Check if we already have this peer
    if (this.peers.has(id)) {
      this.logger.debug(`Peer ${id} already connected`);
      return this.peers.get(id);
    }

    // Check if we can add more peers
    const maxPeers: any = this.configService.get<number>('network.maxPeers');
    if (this.peers.size >= maxPeers) {
      throw new Error(`Maximum peer limit reached (${maxPeers})`);
    }

    // Create new peer object
    const now = Date.now();
    const peer: Peer = {
      id,
      address,
      port,
      version: '1.0.0', // In a real implementation, this would come from handshake
      connected: true,
      lastSeen: now,
      connectionTime: now,
    };

    // Add to peer list
    this.peers.set(id, peer);

    // Emit event
    this.eventEmitter.emit('p2p.peer.connected', peer);

    this.logger.log(`Added new peer: ${id}`);
    return peer;
  }

  // Remove a peer
  removePeer(peerId: string): boolean {
    const peer = this.peers.get(peerId);
    if (!peer) {
      return false;
    }

    // Remove from peer list
    this.peers.delete(peerId);

    // Emit event
    this.eventEmitter.emit('p2p.peer.disconnected', peer);

    this.logger.log(`Removed peer: ${peerId}`);
    return true;
  }

  // Update peer information
  updatePeer(peerId: string, updates: Partial<Peer>): Peer {
    const peer = this.peers.get(peerId);
    if (!peer) {
      throw new Error(`Peer ${peerId} not found`);
    }

    // Update peer properties
    const updatedPeer = { ...peer, ...updates, lastSeen: Date.now() };
    this.peers.set(peerId, updatedPeer);

    return updatedPeer;
  }

  // Get a specific peer
  getPeer(peerId: string): Peer | undefined {
    return this.peers.get(peerId);
  }

  // Get all peers
  getPeers(): Peer[] {
    return Array.from(this.peers.values());
  }

  // Get connected peers
  getConnectedPeers(): Peer[] {
    return this.getPeers().filter((peer) => peer.connected);
  }

  // Get peer count
  getPeerCount(): number {
    return this.peers.size;
  }

  // Check if a peer exists
  hasPeer(peerId: string): boolean {
    return this.peers.has(peerId);
  }

  // Disconnect a peer
  async disconnectPeer(peerId: string): Promise<boolean> {
    const peer = this.peers.get(peerId);
    if (!peer || !peer.connected) {
      return false;
    }

    // Update connection status
    peer.connected = false;
    this.peers.set(peerId, peer);

    // Emit event
    this.eventEmitter.emit('p2p.peer.disconnected', peer);

    // In a real implementation, we would close the socket connection

    this.logger.log(`Disconnected peer: ${peerId}`);
    return true;
  }

  // Disconnect all peers
  async disconnectAll(): Promise<number> {
    const connectedPeers = this.getConnectedPeers();
    let disconnectedCount = 0;

    for (const peer of connectedPeers) {
      const success = await this.disconnectPeer(peer.id);
      if (success) {
        disconnectedCount++;
      }
    }

    return disconnectedCount;
  }

  // Get peers with highest block height
  getPeersWithHighestBlock(): Peer[] {
    const peers: any = this.getConnectedPeers().filter(
      (peer) => peer.blockHeight !== undefined
    );

    if (peers.length === 0) {
      return [];
    }

    // Find maximum height
    const maxHeight = Math.max(...peers.map((peer: any) => peer.blockHeight));

    // Return peers with this height
    return peers.filter((peer: any) => peer.blockHeight === maxHeight);
  }

  // Get random peers (useful for various P2P operations)
  getRandomPeers(count: number): Peer[] {
    const connectedPeers = this.getConnectedPeers();

    if (connectedPeers.length <= count) {
      return connectedPeers;
    }

    // Shuffle peers
    const shuffled = [...connectedPeers].sort(() => 0.5 - Math.random());

    // Return requested count
    return shuffled.slice(0, count);
  }
}
