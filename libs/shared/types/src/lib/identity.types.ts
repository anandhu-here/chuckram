// libs/core/identity/src/lib/types.ts

/**
 * Identity verification level
 */
export enum VerificationLevel {
  NONE = 0,
  BASIC = 1, // Email/Phone verification
  STANDARD = 2, // Address verification
  ADVANCED = 3, // Document verification
  BIOMETRIC = 4, // Biometric verification
}

/**
 * Identity verification status
 */
export enum VerificationStatus {
  NONE = 'NONE',
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

/**
 * Document type
 */
export enum DocumentType {
  AADHAAR = 'AADHAAR',
  PAN = 'PAN',
  VOTER_ID = 'VOTER_ID',
  PASSPORT = 'PASSPORT',
  DRIVING_LICENSE = 'DRIVING_LICENSE',
  UTILITY_BILL = 'UTILITY_BILL',
}

/**
 * Biometric type
 */
export enum BiometricType {
  FINGERPRINT = 'FINGERPRINT',
  FACE = 'FACE',
  IRIS = 'IRIS',
  VOICE = 'VOICE',
}

/**
 * Digital identity document
 */
export interface IdentityDocument {
  id: string;
  type: DocumentType;
  issuer: string;
  issuedAt: number;
  expiresAt: number;
  status: VerificationStatus;
  verifiedAt?: number;
  verifiedBy?: string;
  documentHash: string;
  metadata: Record<string, any>;
}

/**
 * Biometric record
 */
export interface BiometricData {
  id: string;
  type: BiometricType;
  hash: string; // Hash of biometric data
  createdAt: number;
  updatedAt: number;
  status: VerificationStatus;
  verifiedAt?: number;
  verifiedBy?: string;
}

/**
 * Credential claim
 */
export interface Claim {
  id: string;
  type: string;
  value: string;
  issuer: string;
  subject: string;
  issuedAt: number;
  expiresAt: number;
  status: VerificationStatus;
  evidence?: string[];
  hash: string; // Hash of the claim data
  signature: string; // Signature from issuer
}

/**
 * Digital identity
 */
export interface DigitalIdentity {
  did: string; // Decentralized Identifier
  publicKey: string;
  controller: string; // Owner of this identity
  createdAt: number;
  updatedAt: number;
  verificationLevel: VerificationLevel;
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
  documents: IdentityDocument[];
  biometricData: BiometricData[];
  claims: Claim[];
  metadata: Record<string, any>;
}

/**
 * Verification request
 */
export interface VerificationRequest {
  id: string;
  did: string;
  type: 'DOCUMENT' | 'BIOMETRIC' | 'CLAIM';
  documentId?: string;
  biometricId?: string;
  claimId?: string;
  status: VerificationStatus;
  submittedAt: number;
  verifiedAt?: number;
  verifiedBy?: string;
  rejectionReason?: string;
  metadata: Record<string, any>;
}

/**
 * Aadhaar data for simulation
 */
export interface AadhaarData {
  uid: string; // 12-digit Aadhaar number
  name: string;
  dateOfBirth: string; // YYYY-MM-DD
  gender: 'M' | 'F' | 'T';
  address: {
    house: string;
    street: string;
    landmark?: string;
    locality: string;
    district: string;
    state: string;
    pincode: string;
  };
  phone?: string;
  email?: string;
  photo?: string; // Base64 encoded photo
  fingerprint?: string; // Hash of fingerprint data
  iris?: string; // Hash of iris data
  lastVerified: number; // Last verification timestamp
}

/**
 * Zero-knowledge proof data
 */
export interface ZkProof {
  id: string;
  type: string;
  proof: string; // ZK proof data
  verifier: string; // Verification key or address
  createdAt: number;
  validUntil: number;
  status: 'VALID' | 'INVALID' | 'EXPIRED';
}

/**
 * Identity service configuration
 */
export interface IdentityConfig {
  documentExpiryTime: Record<DocumentType, number>; // Seconds
  claimExpiryTime: Record<string, number>; // Seconds
  verificationTimeout: number; // Seconds
  requiredDocumentsForLevel: Record<VerificationLevel, DocumentType[]>;
  requiredBiometricsForLevel: Record<VerificationLevel, BiometricType[]>;
  autoVerification: boolean; // Enable auto verification
}

/**
 * Default identity configuration
 */
export const DEFAULT_IDENTITY_CONFIG: IdentityConfig = {
  documentExpiryTime: {
    [DocumentType.AADHAAR]: 5 * 365 * 24 * 60 * 60, // 5 years
    [DocumentType.PAN]: 10 * 365 * 24 * 60 * 60, // 10 years
    [DocumentType.VOTER_ID]: 5 * 365 * 24 * 60 * 60, // 5 years
    [DocumentType.PASSPORT]: 10 * 365 * 24 * 60 * 60, // 10 years
    [DocumentType.DRIVING_LICENSE]: 20 * 365 * 24 * 60 * 60, // 20 years
    [DocumentType.UTILITY_BILL]: 90 * 24 * 60 * 60, // 90 days
  },
  claimExpiryTime: {
    NAME: 10 * 365 * 24 * 60 * 60, // 10 years
    AGE: 1 * 365 * 24 * 60 * 60, // 1 year
    ADDRESS: 1 * 365 * 24 * 60 * 60, // 1 year
    CITIZENSHIP: 10 * 365 * 24 * 60 * 60, // 10 years
    EDUCATION: 50 * 365 * 24 * 60 * 60, // 50 years
  },
  verificationTimeout: 7 * 24 * 60 * 60, // 7 days
  requiredDocumentsForLevel: {
    [VerificationLevel.NONE]: [],
    [VerificationLevel.BASIC]: [],
    [VerificationLevel.STANDARD]: [DocumentType.AADHAAR],
    [VerificationLevel.ADVANCED]: [DocumentType.AADHAAR, DocumentType.PAN],
    [VerificationLevel.BIOMETRIC]: [DocumentType.AADHAAR, DocumentType.PAN],
  },
  requiredBiometricsForLevel: {
    [VerificationLevel.NONE]: [],
    [VerificationLevel.BASIC]: [],
    [VerificationLevel.STANDARD]: [],
    [VerificationLevel.ADVANCED]: [],
    [VerificationLevel.BIOMETRIC]: [BiometricType.FINGERPRINT],
  },
  autoVerification: false,
};
