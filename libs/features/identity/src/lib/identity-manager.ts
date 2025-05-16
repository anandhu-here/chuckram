// libs/core/identity/src/lib/identity-manager.ts

import {
  DigitalIdentity,
  IdentityDocument,
  BiometricData,
  Claim,
  VerificationRequest,
  VerificationStatus,
  VerificationLevel,
  DocumentType,
  BiometricType,
  IdentityConfig,
  DEFAULT_IDENTITY_CONFIG,
} from '@digital-chuckram/types';
import { DidGenerator } from './did-generator';
import {
  AadhaarSimulator,
  AadhaarVerificationResponse,
  AadhaarAuthMode,
} from './aadhaar-simulator';
import { ZkProofManager } from './zk-proof-manager';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

/**
 * Identity creation parameters
 */
export interface IdentityCreationParams {
  publicKey: string;
  controller: string;
  metadata?: Record<string, any>;
}

/**
 * Document submission parameters
 */
export interface DocumentSubmissionParams {
  did: string;
  type: DocumentType;
  documentData: any;
  metadata?: Record<string, any>;
}

/**
 * Biometric submission parameters
 */
export interface BiometricSubmissionParams {
  did: string;
  type: BiometricType;
  biometricData: string; // Base64 encoded biometric data
  metadata?: Record<string, any>;
}

/**
 * Claim submission parameters
 */
export interface ClaimSubmissionParams {
  did: string;
  type: string;
  value: string;
  issuer: string;
  evidence?: string[];
  metadata?: Record<string, any>;
}

/**
 * Manager for digital identities
 */
export class IdentityManager {
  private identities: Map<string, DigitalIdentity>;
  private verificationRequests: Map<string, VerificationRequest>;
  private didGenerator: DidGenerator;
  private aadhaarSimulator: AadhaarSimulator;
  private zkProofManager: ZkProofManager;
  private config: IdentityConfig;

  constructor(
    didGenerator: DidGenerator,
    aadhaarSimulator: AadhaarSimulator,
    zkProofManager: ZkProofManager,
    config?: Partial<IdentityConfig>
  ) {
    this.identities = new Map();
    this.verificationRequests = new Map();
    this.didGenerator = didGenerator;
    this.aadhaarSimulator = aadhaarSimulator;
    this.zkProofManager = zkProofManager;
    this.config = { ...DEFAULT_IDENTITY_CONFIG, ...config };
  }

  /**
   * Create a new digital identity
   */
  createIdentity(params: IdentityCreationParams): DigitalIdentity {
    const { publicKey, controller, metadata } = params;

    // Generate DID from public key
    const did = this.didGenerator.generateFromPublicKey(publicKey);

    // Check if identity already exists
    if (this.identities.has(did)) {
      throw new Error(`Identity with DID ${did} already exists`);
    }

    const now = Date.now();

    // Create new identity
    const identity: DigitalIdentity = {
      did,
      publicKey,
      controller,
      createdAt: now,
      updatedAt: now,
      verificationLevel: VerificationLevel.NONE,
      status: 'ACTIVE',
      documents: [],
      biometricData: [],
      claims: [],
      metadata: metadata || {},
    };

    // Store identity
    this.identities.set(did, identity);

    return identity;
  }

  /**
   * Get identity by DID
   */
  getIdentity(did: string): DigitalIdentity | undefined {
    return this.identities.get(did);
  }

  /**
   * Submit a document for verification
   */
  submitDocument(params: DocumentSubmissionParams): VerificationRequest {
    const { did, type, documentData, metadata } = params;

    // Get identity
    const identity = this.identities.get(did);
    if (!identity) {
      throw new Error(`Identity with DID ${did} not found`);
    }

    // Generate document hash
    const documentHash = createHash('sha256')
      .update(JSON.stringify(documentData))
      .digest('hex');

    const now = Date.now();
    const documentId = uuidv4();

    // Create document record
    const document: IdentityDocument = {
      id: documentId,
      type,
      issuer: 'SELF', // Initially self-submitted
      issuedAt: now,
      expiresAt: now + this.config.documentExpiryTime[type] * 1000,
      status: VerificationStatus.PENDING,
      documentHash,
      metadata: metadata || {},
    };

    // Add document to identity
    identity.documents.push(document);
    identity.updatedAt = now;

    // Create verification request
    const verificationRequest: VerificationRequest = {
      id: uuidv4(),
      did,
      type: 'DOCUMENT',
      documentId,
      status: VerificationStatus.PENDING,
      submittedAt: now,
      metadata: {
        documentType: type,
        ...metadata,
      },
    };

    // Store verification request
    this.verificationRequests.set(verificationRequest.id, verificationRequest);

    // Auto-verify if enabled
    if (this.config.autoVerification) {
      this.verifyDocument(verificationRequest.id);
    }

    return verificationRequest;
  }

  /**
   * Submit biometric data for verification
   */
  submitBiometric(params: BiometricSubmissionParams): VerificationRequest {
    const { did, type, biometricData, metadata } = params;

    // Get identity
    const identity = this.identities.get(did);
    if (!identity) {
      throw new Error(`Identity with DID ${did} not found`);
    }

    // Generate biometric hash
    const biometricHash = createHash('sha256')
      .update(biometricData)
      .digest('hex');

    const now = Date.now();
    const biometricId = uuidv4();

    // Create biometric record
    const biometric: BiometricData = {
      id: biometricId,
      type,
      hash: biometricHash,
      createdAt: now,
      updatedAt: now,
      status: VerificationStatus.PENDING,
    };

    // Add biometric to identity
    identity.biometricData.push(biometric);
    identity.updatedAt = now;

    // Create verification request
    const verificationRequest: VerificationRequest = {
      id: uuidv4(),
      did,
      type: 'BIOMETRIC',
      biometricId,
      status: VerificationStatus.PENDING,
      submittedAt: now,
      metadata: {
        biometricType: type,
        ...metadata,
      },
    };

    // Store verification request
    this.verificationRequests.set(verificationRequest.id, verificationRequest);

    // Auto-verify if enabled
    if (this.config.autoVerification) {
      this.verifyBiometric(verificationRequest.id);
    }

    return verificationRequest;
  }

  /**
   * Submit a claim for verification
   */
  submitClaim(params: ClaimSubmissionParams): VerificationRequest {
    const { did, type, value, issuer, evidence, metadata } = params;

    // Get identity
    const identity = this.identities.get(did);
    if (!identity) {
      throw new Error(`Identity with DID ${did} not found`);
    }

    const now = Date.now();
    const claimId = uuidv4();

    // Generate claim hash
    const claimHash = createHash('sha256')
      .update(JSON.stringify({ type, value, issuer, did }))
      .digest('hex');

    // Create claim
    const claim: Claim = {
      id: claimId,
      type,
      value,
      issuer,
      subject: did,
      issuedAt: now,
      expiresAt: now + (this.config.claimExpiryTime[type] || 31536000) * 1000, // Default 1 year
      status: VerificationStatus.PENDING,
      evidence,
      hash: claimHash,
      signature: '', // Will be populated upon verification
    };

    // Add claim to identity
    identity.claims.push(claim);
    identity.updatedAt = now;

    // Create verification request
    const verificationRequest: VerificationRequest = {
      id: uuidv4(),
      did,
      type: 'CLAIM',
      claimId,
      status: VerificationStatus.PENDING,
      submittedAt: now,
      metadata: {
        claimType: type,
        issuer,
        ...metadata,
      },
    };

    // Store verification request
    this.verificationRequests.set(verificationRequest.id, verificationRequest);

    // Auto-verify if enabled
    if (this.config.autoVerification) {
      this.verifyClaim(verificationRequest.id);
    }

    return verificationRequest;
  }

  /**
   * Verify an Aadhaar document
   */
  verifyAadhaarDocument(
    did: string,
    aadhaarNumber: string,
    authMode: AadhaarAuthMode,
    authData: any
  ): VerificationRequest {
    // Get identity
    const identity = this.identities.get(did);
    if (!identity) {
      throw new Error(`Identity with DID ${did} not found`);
    }

    // Verify Aadhaar with simulator
    const response = this.aadhaarSimulator.verifyAadhaar({
      aadhaarNumber,
      authMode,
      ...authData,
    });

    const now = Date.now();
    const documentId = uuidv4();

    // Create document
    const document: IdentityDocument = {
      id: documentId,
      type: DocumentType.AADHAAR,
      issuer: 'UIDAI', // Aadhaar authority
      issuedAt: now,
      expiresAt:
        now + this.config.documentExpiryTime[DocumentType.AADHAAR] * 1000,
      status: response.success
        ? VerificationStatus.VERIFIED
        : VerificationStatus.REJECTED,
      verifiedAt: response.success ? now : undefined,
      verifiedBy: response.success ? 'UIDAI' : undefined,
      documentHash: createHash('sha256').update(aadhaarNumber).digest('hex'),
      metadata: {
        aadhaarNumber:
          aadhaarNumber.substring(0, 4) + 'XXXX' + aadhaarNumber.substring(8), // Mask middle digits
        name: response.data?.name,
        txnId: response.txnId,
      },
    };

    // Add or replace Aadhaar document
    const aadhaarIndex = identity.documents.findIndex(
      (d) => d.type === DocumentType.AADHAAR
    );
    if (aadhaarIndex >= 0) {
      identity.documents[aadhaarIndex] = document;
    } else {
      identity.documents.push(document);
    }

    identity.updatedAt = now;

    // Create verification request
    const verificationRequest: VerificationRequest = {
      id: uuidv4(),
      did,
      type: 'DOCUMENT',
      documentId,
      status: response.success
        ? VerificationStatus.VERIFIED
        : VerificationStatus.REJECTED,
      submittedAt: now,
      verifiedAt: response.success ? now : undefined,
      verifiedBy: response.success ? 'UIDAI' : undefined,
      rejectionReason: response.success ? undefined : response.error,
      metadata: {
        documentType: DocumentType.AADHAAR,
        authMode,
        txnId: response.txnId,
      },
    };

    // Store verification request
    this.verificationRequests.set(verificationRequest.id, verificationRequest);

    // Update verification level if successful
    if (response.success) {
      this.updateVerificationLevel(did);
    }

    return verificationRequest;
  }

  /**
   * Verify a document
   */
  verifyDocument(requestId: string, verifier?: string): boolean {
    const request = this.verificationRequests.get(requestId);
    if (!request || request.type !== 'DOCUMENT' || !request.documentId) {
      return false;
    }

    const identity = this.identities.get(request.did);
    if (!identity) {
      return false;
    }

    const document = identity.documents.find(
      (d) => d.id === request.documentId
    );
    if (!document) {
      return false;
    }

    const now = Date.now();

    // In a real implementation, this would involve actual verification
    // For simulation, we'll just mark it as verified

    document.status = VerificationStatus.VERIFIED;
    document.verifiedAt = now;
    document.verifiedBy = verifier || 'SYSTEM';

    request.status = VerificationStatus.VERIFIED;
    request.verifiedAt = now;
    request.verifiedBy = verifier || 'SYSTEM';

    identity.updatedAt = now;

    // Update verification level
    this.updateVerificationLevel(request.did);

    return true;
  }

  /**
   * Verify a biometric
   */
  verifyBiometric(requestId: string, verifier?: string): boolean {
    const request = this.verificationRequests.get(requestId);
    if (!request || request.type !== 'BIOMETRIC' || !request.biometricId) {
      return false;
    }

    const identity = this.identities.get(request.did);
    if (!identity) {
      return false;
    }

    const biometric = identity.biometricData.find(
      (b) => b.id === request.biometricId
    );
    if (!biometric) {
      return false;
    }

    const now = Date.now();

    // In a real implementation, this would involve actual verification
    // For simulation, we'll just mark it as verified

    biometric.status = VerificationStatus.VERIFIED;
    biometric.verifiedAt = now;
    biometric.verifiedBy = verifier || 'SYSTEM';

    request.status = VerificationStatus.VERIFIED;
    request.verifiedAt = now;
    request.verifiedBy = verifier || 'SYSTEM';

    identity.updatedAt = now;

    // Update verification level
    this.updateVerificationLevel(request.did);

    return true;
  }

  /**
   * Verify a claim
   */
  verifyClaim(
    requestId: string,
    verifier?: string,
    signature?: string
  ): boolean {
    const request = this.verificationRequests.get(requestId);
    if (!request || request.type !== 'CLAIM' || !request.claimId) {
      return false;
    }

    const identity = this.identities.get(request.did);
    if (!identity) {
      return false;
    }

    const claim = identity.claims.find((c) => c.id === request.claimId);
    if (!claim) {
      return false;
    }

    const now = Date.now();

    // In a real implementation, this would involve actual verification
    // For simulation, we'll just mark it as verified

    claim.status = VerificationStatus.VERIFIED;
    claim.signature = signature || 'VERIFIED'; // In real life, this would be cryptographic signature

    request.status = VerificationStatus.VERIFIED;
    request.verifiedAt = now;
    request.verifiedBy = verifier || 'SYSTEM';

    identity.updatedAt = now;

    return true;
  }

  /**
   * Reject a verification request
   */
  rejectVerificationRequest(
    requestId: string,
    reason: string,
    rejector?: string
  ): boolean {
    const request = this.verificationRequests.get(requestId);
    if (!request) {
      return false;
    }

    const identity = this.identities.get(request.did);
    if (!identity) {
      return false;
    }

    const now = Date.now();

    request.status = VerificationStatus.REJECTED;
    request.rejectionReason = reason;

    if (request.type === 'DOCUMENT' && request.documentId) {
      const document = identity.documents.find(
        (d) => d.id === request.documentId
      );
      if (document) {
        document.status = VerificationStatus.REJECTED;
      }
    } else if (request.type === 'BIOMETRIC' && request.biometricId) {
      const biometric = identity.biometricData.find(
        (b) => b.id === request.biometricId
      );
      if (biometric) {
        biometric.status = VerificationStatus.REJECTED;
      }
    } else if (request.type === 'CLAIM' && request.claimId) {
      const claim = identity.claims.find((c) => c.id === request.claimId);
      if (claim) {
        claim.status = VerificationStatus.REJECTED;
      }
    }

    identity.updatedAt = now;

    return true;
  }

  /**
   * Generate a zero-knowledge proof for an identity attribute
   */
  generateAgeProof(
    did: string,
    verifierDid: string,
    ageThreshold: number
  ): string | null {
    const identity = this.identities.get(did);
    if (!identity) {
      return null;
    }

    // Find a verified claim with age or calculate from verified birth date
    let age: number | null = null;

    // Check for direct age claim
    const ageClaim = identity.claims.find(
      (c) => c.type === 'AGE' && c.status === VerificationStatus.VERIFIED
    );

    if (ageClaim) {
      age = parseInt(ageClaim.value, 10);
    } else {
      // Check for birth date claim
      const birthDateClaim = identity.claims.find(
        (c) =>
          c.type === 'DATE_OF_BIRTH' && c.status === VerificationStatus.VERIFIED
      );

      if (birthDateClaim) {
        const birthDate = new Date(birthDateClaim.value);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();

        // Adjust age if birthday hasn't occurred yet this year
        if (
          today.getMonth() < birthDate.getMonth() ||
          (today.getMonth() === birthDate.getMonth() &&
            today.getDate() < birthDate.getDate())
        ) {
          age--;
        }
      }
    }

    if (age === null) {
      // No verified age information available
      return null;
    }

    // Generate ZK proof
    const proof = this.zkProofManager.createAgeProof(
      did,
      verifierDid,
      ageThreshold,
      age
    );

    return proof ? proof.id : null;
  }

  /**
   * Update verification level based on documents and biometrics
   */
  private updateVerificationLevel(did: string): void {
    const identity = this.identities.get(did);
    if (!identity) {
      return;
    }

    // Get verified documents and biometrics
    const verifiedDocuments = identity.documents.filter(
      (d) => d.status === VerificationStatus.VERIFIED
    );

    const verifiedBiometrics = identity.biometricData.filter(
      (b) => b.status === VerificationStatus.VERIFIED
    );

    // Check verification level requirements
    let newLevel = VerificationLevel.NONE;

    // Check for each level, from highest to lowest
    for (
      let level = VerificationLevel.BIOMETRIC;
      level > VerificationLevel.NONE;
      level--
    ) {
      const requiredDocs = this.config.requiredDocumentsForLevel[level];
      const requiredBiometrics = this.config.requiredBiometricsForLevel[level];

      // Check if all required documents exist
      const hasRequiredDocs = requiredDocs.every((docType) =>
        verifiedDocuments.some((d) => d.type === docType)
      );

      // Check if all required biometrics exist
      const hasRequiredBiometrics = requiredBiometrics.every((bioType) =>
        verifiedBiometrics.some((b) => b.type === bioType)
      );

      if (hasRequiredDocs && hasRequiredBiometrics) {
        newLevel = level;
        break;
      }
    }

    // Update level if changed
    if (newLevel !== identity.verificationLevel) {
      identity.verificationLevel = newLevel;
      identity.updatedAt = Date.now();
    }
  }

  /**
   * Get verification requests for an identity
   */
  getVerificationRequests(did: string): VerificationRequest[] {
    return Array.from(this.verificationRequests.values()).filter(
      (r) => r.did === did
    );
  }

  /**
   * Get verification request by ID
   */
  getVerificationRequest(requestId: string): VerificationRequest | undefined {
    return this.verificationRequests.get(requestId);
  }

  /**
   * Get pending verification requests
   */
  getPendingVerificationRequests(): VerificationRequest[] {
    return Array.from(this.verificationRequests.values()).filter(
      (r) => r.status === VerificationStatus.PENDING
    );
  }

  /**
   * Export identity data
   */
  exportIdentity(did: string): DigitalIdentity | undefined {
    return this.identities.get(did);
  }

  /**
   * Import identity data
   */
  importIdentity(identity: DigitalIdentity): void {
    this.identities.set(identity.did, identity);
  }

  /**
   * Get all identities
   */
  getAllIdentities(): DigitalIdentity[] {
    return Array.from(this.identities.values());
  }
}
