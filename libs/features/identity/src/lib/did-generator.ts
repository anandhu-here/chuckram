// libs/core/identity/src/lib/did-generator.ts

import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

/**
 * DID format options
 */
export interface DIDOptions {
  method?: string; // DID method name (default: 'chuckram')
  network?: string; // Network identifier (default: 'main')
  includeTimestamp?: boolean; // Include creation timestamp
}

/**
 * Generator for Decentralized Identifiers (DIDs)
 */
export class DidGenerator {
  private method: string;
  private network: string;
  private includeTimestamp: boolean;

  /**
   * Create a new DID generator
   */
  constructor(options?: DIDOptions) {
    this.method = options?.method || 'chuckram';
    this.network = options?.network || 'main';
    this.includeTimestamp = options?.includeTimestamp ?? false;
  }

  /**
   * Generate a DID from a public key
   */
  generateFromPublicKey(publicKey: string): string {
    const hash = createHash('sha256').update(publicKey).digest('hex');

    return this.formatDid(hash.slice(0, 32));
  }

  /**
   * Generate a DID from an Aadhaar number
   */
  generateFromAadhaar(aadhaarNumber: string): string {
    // Safety: Never use actual Aadhaar number directly
    // Instead, create a hash of it
    const hash = createHash('sha256').update(aadhaarNumber).digest('hex');

    return this.formatDid(hash.slice(0, 32));
  }

  /**
   * Generate a random DID
   */
  generateRandom(): string {
    const uuid = uuidv4().replace(/-/g, '');
    return this.formatDid(uuid);
  }

  /**
   * Parse a DID into its components
   */
  parseDid(did: string): {
    method: string;
    network: string;
    identifier: string;
    timestamp?: number;
  } {
    // DID format: did:method:network:identifier[:timestamp]
    const parts = did.split(':');

    if (parts.length < 4 || parts[0] !== 'did') {
      throw new Error(`Invalid DID format: ${did}`);
    }

    return {
      method: parts[1],
      network: parts[2],
      identifier: parts[3],
      timestamp: parts.length > 4 ? parseInt(parts[4]) : undefined,
    };
  }

  /**
   * Validate a DID
   */
  validateDid(did: string): boolean {
    try {
      const parts = this.parseDid(did);
      return (
        parts.method === this.method &&
        parts.network === this.network &&
        parts.identifier.length >= 16
      );
    } catch (e) {
      return false;
    }
  }

  /**
   * Format identifier into a DID
   */
  private formatDid(identifier: string): string {
    let did = `did:${this.method}:${this.network}:${identifier}`;

    if (this.includeTimestamp) {
      const timestamp = Math.floor(Date.now() / 1000);
      did += `:${timestamp}`;
    }

    return did;
  }

  /**
   * Generate a DID URL for a specific service
   */
  generateDidUrl(did: string, service: string, path?: string): string {
    if (!this.validateDid(did)) {
      throw new Error(`Invalid DID: ${did}`);
    }

    let url = `${did}`;

    if (service) {
      url += `;service=${service}`;
    }

    if (path) {
      // Ensure path starts with /
      const formattedPath = path.startsWith('/') ? path : `/${path}`;
      url += formattedPath;
    }

    return url;
  }
}
