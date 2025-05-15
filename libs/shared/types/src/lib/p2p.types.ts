export interface Peer {
  id: string;
  address: string;
  port: number;
  lastSeen: number;
  version: string;
  chainHeight: number;
}

export interface NetworkConfig {
  port: number;
  maxPeers: number;
  seedPeers: Peer[];
  networkId: string;
  version: string;
}

export interface NetworkMessage {
  type: MessageType;
  payload: any;
  from: string;
  timestamp: number;
  signature?: string;
}

export enum MessageType {
  HANDSHAKE = 'HANDSHAKE',
  BLOCK_ANNOUNCEMENT = 'BLOCK_ANNOUNCEMENT',
  BLOCK_REQUEST = 'BLOCK_REQUEST',
  BLOCK_RESPONSE = 'BLOCK_RESPONSE',
  TRANSACTION_ANNOUNCEMENT = 'TRANSACTION_ANNOUNCEMENT',
  PEER_DISCOVERY = 'PEER_DISCOVERY',
  PEER_LIST = 'PEER_LIST',
  CONSENSUS_MESSAGE = 'CONSENSUS_MESSAGE',
  PING = 'PING',
  PONG = 'PONG',
}

export interface HandshakePayload {
  version: string;
  networkId: string;
  chainHeight: number;
  peerId: string;
}

export interface BlockAnnouncementPayload {
  blockHash: string;
  blockHeight: number;
  previousHash: string;
}

export interface PeerDiscoveryPayload {
  peers: Peer[];
}
