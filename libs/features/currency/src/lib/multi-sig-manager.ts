import { createHash, createSign, createVerify } from 'crypto';
import {
  ChuckramTransaction,
  TransactionSignature,
} from '@digital-chuckram/types';

export interface MultiSigConfig {
  requiredSignatures: number;
  authorizedSigners: string[]; // Public keys
  signingThreshold?: number; // Percentage (0-100)
}

export class MultiSigTransactionManager {
  private config: MultiSigConfig;

  constructor(config: MultiSigConfig) {
    this.config = config;
    this.validateConfig();
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    if (this.config.requiredSignatures < 1) {
      throw new Error('Required signatures must be at least 1');
    }

    if (this.config.requiredSignatures > this.config.authorizedSigners.length) {
      throw new Error(
        'Required signatures cannot exceed number of authorized signers'
      );
    }

    if (this.config.signingThreshold !== undefined) {
      if (
        this.config.signingThreshold < 0 ||
        this.config.signingThreshold > 100
      ) {
        throw new Error('Signing threshold must be between 0 and 100');
      }
    }
  }

  /**
   * Get required number of signatures based on threshold
   */
  getRequiredSignatures(): number {
    if (this.config.signingThreshold !== undefined) {
      const calculated = Math.ceil(
        (this.config.authorizedSigners.length * this.config.signingThreshold) /
          100
      );
      return Math.max(calculated, 1);
    }
    return this.config.requiredSignatures;
  }

  /**
   * Check if a public key is authorized to sign
   */
  isAuthorizedSigner(publicKey: string): boolean {
    return this.config.authorizedSigners.includes(publicKey);
  }

  /**
   * Sign transaction data
   */
  signTransaction(
    transaction: Partial<ChuckramTransaction>,
    privateKey: string,
    publicKey: string
  ): TransactionSignature {
    if (!this.isAuthorizedSigner(publicKey)) {
      throw new Error('Public key is not an authorized signer');
    }

    const dataToSign = this.getSigningData(transaction);
    const sign = createSign('SHA256');
    sign.update(dataToSign);
    sign.end();

    const signature = sign.sign(privateKey, 'hex');

    return {
      publicKey,
      signature,
      timestamp: Date.now(),
    };
  }

  /**
   * Verify a single signature
   */
  verifySignature(
    transaction: Partial<ChuckramTransaction>,
    signature: TransactionSignature
  ): boolean {
    if (!this.isAuthorizedSigner(signature.publicKey)) {
      return false;
    }

    const dataToSign = this.getSigningData(transaction);
    const verify = createVerify('SHA256');
    verify.update(dataToSign);
    verify.end();

    return verify.verify(signature.publicKey, signature.signature, 'hex');
  }

  /**
   * Verify all signatures on a transaction
   */
  verifyTransaction(transaction: ChuckramTransaction): boolean {
    const requiredSigs = this.getRequiredSignatures();

    if (
      !transaction.signatures ||
      transaction.signatures.length < requiredSigs
    ) {
      return false;
    }

    // Check for duplicate signers
    const signers = new Set<string>();
    for (const sig of transaction.signatures) {
      if (signers.has(sig.publicKey)) {
        return false; // Duplicate signer
      }
      signers.add(sig.publicKey);
    }

    // Verify each signature
    let validSignatures = 0;
    for (const sig of transaction.signatures) {
      if (this.verifySignature(transaction, sig)) {
        validSignatures++;
      }
    }

    return validSignatures >= requiredSigs;
  }

  /**
   * Get signing data from transaction
   */
  private getSigningData(transaction: Partial<ChuckramTransaction>): string {
    const data = {
      type: transaction.type,
      from: transaction.from,
      to: transaction.to,
      amount: transaction.amount?.toString(),
      fee: transaction.fee?.toString(),
      nonce: transaction.nonce,
      timestamp: transaction.timestamp,
      metadata: transaction.metadata,
    };

    return JSON.stringify(data);
  }

  /**
   * Check if transaction needs more signatures
   */
  needsMoreSignatures(transaction: ChuckramTransaction): boolean {
    const requiredSigs = this.getRequiredSignatures();
    const currentSigs = transaction.signatures?.length || 0;
    return currentSigs < requiredSigs;
  }

  /**
   * Get missing signatures count
   */
  getMissingSignaturesCount(transaction: ChuckramTransaction): number {
    const requiredSigs = this.getRequiredSignatures();
    const currentSigs = transaction.signatures?.length || 0;
    return Math.max(0, requiredSigs - currentSigs);
  }

  /**
   * Create a government multi-sig configuration
   */
  static createGovernmentConfig(
    signerPublicKeys: string[],
    threshold: number = 66
  ): MultiSigConfig {
    return {
      requiredSignatures: Math.ceil(
        (signerPublicKeys.length * threshold) / 100
      ),
      authorizedSigners: signerPublicKeys,
      signingThreshold: threshold,
    };
  }

  /**
   * Create a standard multi-sig configuration
   */
  static createStandardConfig(
    requiredSignatures: number,
    signerPublicKeys: string[]
  ): MultiSigConfig {
    return {
      requiredSignatures,
      authorizedSigners: signerPublicKeys,
    };
  }
}
