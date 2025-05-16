// libs/core/identity/src/lib/aadhaar-simulator.ts

import { AadhaarData } from '@digital-chuckram/types';
import { createHash } from 'crypto';

/**
 * Aadhaar verification response
 */
export interface AadhaarVerificationResponse {
  success: boolean;
  data?: AadhaarData;
  error?: string;
  txnId?: string;
}

/**
 * Authentication modes for Aadhaar verification
 */
export enum AadhaarAuthMode {
  OTP = 'OTP',
  FINGERPRINT = 'FINGERPRINT',
  IRIS = 'IRIS',
  FACE = 'FACE',
  DEMOGRAPHIC = 'DEMOGRAPHIC',
}

/**
 * Aadhaar verification request
 */
export interface AadhaarVerificationRequest {
  aadhaarNumber: string;
  authMode: AadhaarAuthMode;
  otp?: string;
  fingerprint?: string;
  iris?: string;
  face?: string;
  demographic?: {
    name?: string;
    gender?: 'M' | 'F' | 'T';
    dateOfBirth?: string;
    phone?: string;
    email?: string;
    pincode?: string;
  };
}

/**
 * Simulator for Aadhaar API interactions
 */
export class AadhaarSimulator {
  private aadhaarDatabase: Map<string, AadhaarData>;
  private otpStore: Map<string, string>;
  private txnCounter: number;

  constructor() {
    this.aadhaarDatabase = new Map();
    this.otpStore = new Map();
    this.txnCounter = 1;

    // Initialize with some mock data
    this.initializeMockData();
  }

  /**
   * Generate a random Aadhaar number
   */
  generateAadhaarNumber(): string {
    const num = Math.floor(
      100000000000 + Math.random() * 900000000000
    ).toString();

    // Calculate the checksum (Verhoeff algorithm simplified for simulation)
    const checksum = this.calculateChecksum(num.slice(0, 11));

    return num.slice(0, 11) + checksum;
  }

  /**
   * Generate OTP for Aadhaar verification
   */
  generateOtp(aadhaarNumber: string): {
    success: boolean;
    txnId?: string;
    error?: string;
  } {
    if (!this.validateAadhaarNumber(aadhaarNumber)) {
      return { success: false, error: 'Invalid Aadhaar number' };
    }

    if (!this.aadhaarDatabase.has(aadhaarNumber)) {
      return { success: false, error: 'Aadhaar number not found' };
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const txnId = `TXN${this.txnCounter++}`;

    // Store OTP for verification
    this.otpStore.set(txnId, otp);

    // In a real implementation, this would send OTP to the user's
    // registered mobile number or email
    console.log(
      `[SIMULATION] OTP ${otp} generated for Aadhaar ${aadhaarNumber}, txnId: ${txnId}`
    );

    return { success: true, txnId };
  }

  /**
   * Verify Aadhaar using the requested auth mode
   */
  verifyAadhaar(
    request: AadhaarVerificationRequest
  ): AadhaarVerificationResponse {
    const { aadhaarNumber, authMode } = request;

    // Validate Aadhaar number format
    if (!this.validateAadhaarNumber(aadhaarNumber)) {
      return { success: false, error: 'Invalid Aadhaar number format' };
    }

    // Check if Aadhaar exists in the database
    const aadhaarData = this.aadhaarDatabase.get(aadhaarNumber);
    if (!aadhaarData) {
      return { success: false, error: 'Aadhaar number not found' };
    }

    // Verify based on auth mode
    switch (authMode) {
      case AadhaarAuthMode.OTP:
        return this.verifyWithOtp(aadhaarNumber, request.otp);

      case AadhaarAuthMode.FINGERPRINT:
        return this.verifyWithBiometric(
          aadhaarNumber,
          'fingerprint',
          request.fingerprint
        );

      case AadhaarAuthMode.IRIS:
        return this.verifyWithBiometric(aadhaarNumber, 'iris', request.iris);

      case AadhaarAuthMode.FACE:
        return this.verifyWithBiometric(aadhaarNumber, 'face', request.face);

      case AadhaarAuthMode.DEMOGRAPHIC:
        return this.verifyWithDemographic(aadhaarNumber, request.demographic);

      default:
        return { success: false, error: 'Unsupported authentication mode' };
    }
  }

  /**
   * Verify Aadhaar with OTP
   */
  private verifyWithOtp(
    aadhaarNumber: string,
    otp?: string
  ): AadhaarVerificationResponse {
    if (!otp) {
      return { success: false, error: 'OTP is required' };
    }

    // In a real implementation, we would check the OTP against
    // what was sent to the user's phone/email
    // For simulation, we'll accept any 6-digit OTP
    if (!/^\d{6}$/.test(otp)) {
      return { success: false, error: 'Invalid OTP format' };
    }

    // For simulation, all valid OTPs succeed
    const aadhaarData = this.aadhaarDatabase.get(aadhaarNumber);

    if (!aadhaarData) {
      return { success: false, error: 'Aadhaar number not found' };
    }

    // Update last verified timestamp
    aadhaarData.lastVerified = Date.now();
    this.aadhaarDatabase.set(aadhaarNumber, aadhaarData);

    return {
      success: true,
      data: this.maskSensitiveData(aadhaarData),
      txnId: `TXN${this.txnCounter++}`,
    };
  }

  /**
   * Verify Aadhaar with biometric data
   */
  private verifyWithBiometric(
    aadhaarNumber: string,
    biometricType: 'fingerprint' | 'iris' | 'face',
    biometricData?: string
  ): AadhaarVerificationResponse {
    if (!biometricData) {
      return { success: false, error: `${biometricType} data is required` };
    }

    const aadhaarData = this.aadhaarDatabase.get(aadhaarNumber);

    if (!aadhaarData) {
      return { success: false, error: 'Aadhaar number not found' };
    }

    // For simulation, just check if any biometric data is provided
    if (biometricType === 'fingerprint' && !aadhaarData.fingerprint) {
      return {
        success: false,
        error: 'No fingerprint registered for this Aadhaar',
      };
    }

    if (biometricType === 'iris' && !aadhaarData.iris) {
      return {
        success: false,
        error: 'No iris data registered for this Aadhaar',
      };
    }

    // For simulation, we'll consider any biometric data as valid
    // In a real implementation, we would compare against stored data

    // Update last verified timestamp
    aadhaarData.lastVerified = Date.now();
    this.aadhaarDatabase.set(aadhaarNumber, aadhaarData);

    return {
      success: true,
      data: this.maskSensitiveData(aadhaarData),
      txnId: `TXN${this.txnCounter++}`,
    };
  }

  /**
   * Verify Aadhaar with demographic data
   */
  private verifyWithDemographic(
    aadhaarNumber: string,
    demographic?: any
  ): AadhaarVerificationResponse {
    if (!demographic) {
      return { success: false, error: 'Demographic data is required' };
    }

    const aadhaarData = this.aadhaarDatabase.get(aadhaarNumber);

    if (!aadhaarData) {
      return { success: false, error: 'Aadhaar number not found' };
    }

    // For simulation, check if the provided demographic data matches
    // At least name and one other field should match
    let matches = 0;
    let nameMatches = false;

    if (
      demographic.name &&
      aadhaarData.name.toLowerCase() === demographic.name.toLowerCase()
    ) {
      nameMatches = true;
      matches++;
    }

    if (demographic.gender && aadhaarData.gender === demographic.gender) {
      matches++;
    }

    if (
      demographic.dateOfBirth &&
      aadhaarData.dateOfBirth === demographic.dateOfBirth
    ) {
      matches++;
    }

    if (demographic.phone && aadhaarData.phone === demographic.phone) {
      matches++;
    }

    if (
      demographic.email &&
      aadhaarData.email &&
      aadhaarData.email.toLowerCase() === demographic.email.toLowerCase()
    ) {
      matches++;
    }

    if (
      demographic.pincode &&
      aadhaarData.address.pincode === demographic.pincode
    ) {
      matches++;
    }

    // Name plus at least one other field should match
    if (!nameMatches || matches < 2) {
      return { success: false, error: 'Demographic data does not match' };
    }

    // Update last verified timestamp
    aadhaarData.lastVerified = Date.now();
    this.aadhaarDatabase.set(aadhaarNumber, aadhaarData);

    return {
      success: true,
      data: this.maskSensitiveData(aadhaarData),
      txnId: `TXN${this.txnCounter++}`,
    };
  }

  /**
   * Validate Aadhaar number format
   */
  private validateAadhaarNumber(aadhaarNumber: string): boolean {
    // Basic validation: 12 digits
    if (!/^\d{12}$/.test(aadhaarNumber)) {
      return false;
    }

    // Checksum validation (simplified for simulation)
    const checksum = this.calculateChecksum(aadhaarNumber.slice(0, 11));
    return aadhaarNumber[11] === checksum;
  }

  /**
   * Calculate checksum digit (simplified version of Verhoeff algorithm)
   */
  private calculateChecksum(number: string): string {
    // This is a simplified checksum calculator for simulation
    // Real Aadhaar uses the Verhoeff algorithm
    let sum = 0;
    for (let i = 0; i < number.length; i++) {
      sum += parseInt(number[i]) * ((i % 4) + 1);
    }
    return (sum % 10).toString();
  }

  /**
   * Mask sensitive data before returning
   */
  private maskSensitiveData(data: AadhaarData): AadhaarData {
    const maskedData = { ...data };

    // Mask phone number
    if (maskedData.phone) {
      maskedData.phone =
        maskedData.phone.slice(0, 2) + 'XXXX' + maskedData.phone.slice(-4);
    }

    // Mask email
    if (maskedData.email) {
      const [username, domain] = maskedData.email.split('@');
      maskedData.email =
        username[0] + 'XXX' + username.slice(-1) + '@' + domain;
    }

    return maskedData;
  }

  /**
   * Add or update an Aadhaar record (for testing purposes)
   */
  addAadhaarRecord(data: AadhaarData): void {
    this.aadhaarDatabase.set(data.uid, data);
  }

  /**
   * Initialize with mock data
   */
  private initializeMockData(): void {
    // Create some mock Aadhaar records
    const mockRecords: AadhaarData[] = [
      {
        uid: '123456789012',
        name: 'Arjun Kumar',
        dateOfBirth: '1985-04-15',
        gender: 'M',
        address: {
          house: '42',
          street: 'MG Road',
          locality: 'Indiranagar',
          district: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560038',
        },
        phone: '9876543210',
        email: 'arjun.kumar@example.com',
        fingerprint: createHash('sha256')
          .update('fingerprint-data-1')
          .digest('hex'),
        iris: createHash('sha256').update('iris-data-1').digest('hex'),
        lastVerified: Date.now() - 90 * 24 * 60 * 60 * 1000, // 90 days ago
      },
      {
        uid: '987654321098',
        name: 'Priya Singh',
        dateOfBirth: '1992-08-23',
        gender: 'F',
        address: {
          house: '15A',
          street: 'Park Street',
          landmark: 'Near City Mall',
          locality: 'Kolkata',
          district: 'Kolkata',
          state: 'West Bengal',
          pincode: '700016',
        },
        phone: '8765432109',
        email: 'priya.singh@example.com',
        fingerprint: createHash('sha256')
          .update('fingerprint-data-2')
          .digest('hex'),
        lastVerified: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
      },
      {
        uid: '567890123456',
        name: 'Mohammed Ismail',
        dateOfBirth: '1978-11-05',
        gender: 'M',
        address: {
          house: '28B',
          street: 'Jubilee Hills',
          locality: 'Banjara Hills',
          district: 'Hyderabad',
          state: 'Telangana',
          pincode: '500033',
        },
        phone: '7654321098',
        lastVerified: Date.now() - 180 * 24 * 60 * 60 * 1000, // 180 days ago
      },
    ];

    // Add mock records to the database
    for (const record of mockRecords) {
      this.aadhaarDatabase.set(record.uid, record);
    }
  }
}
