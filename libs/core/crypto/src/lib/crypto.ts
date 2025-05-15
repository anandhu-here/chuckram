import * as crypto from 'crypto';
import { ec as EC } from 'elliptic';

const ec = new EC('secp256k1');

export class CryptoUtils {
  static generateKeyPair() {
    const keyPair = ec.genKeyPair();
    return {
      privateKey: keyPair.getPrivate('hex'),
      publicKey: keyPair.getPublic('hex'),
      address: this.publicKeyToAddress(keyPair.getPublic('hex')),
    };
  }

  static publicKeyToAddress(publicKey: string): string {
    const hash = crypto.createHash('sha256').update(publicKey).digest();

    const ripemd = crypto.createHash('ripemd160').update(hash).digest('hex');

    return `CHK${ripemd}`;
  }

  static hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  static doubleHash(data: string): string {
    const firstHash = this.hash(data);
    return this.hash(firstHash);
  }

  static sign(privateKey: string, data: string): string {
    const key = ec.keyFromPrivate(privateKey);
    const signature = key.sign(this.hash(data));
    return signature.toDER('hex');
  }

  static verify(publicKey: string, data: string, signature: string): boolean {
    try {
      const key = ec.keyFromPublic(publicKey, 'hex');
      return key.verify(this.hash(data), signature);
    } catch {
      return false;
    }
  }

  static generateMerkleRoot(hashes: string[]): string {
    if (hashes.length === 0) return '';
    if (hashes.length === 1) return hashes[0];

    const tree = [...hashes];

    while (tree.length > 1) {
      const newLevel = [];

      for (let i = 0; i < tree.length; i += 2) {
        const left = tree[i];
        const right = tree[i + 1] || left;
        newLevel.push(this.hash(left + right));
      }

      tree.length = 0;
      tree.push(...newLevel);
    }

    return tree[0];
  }
}
