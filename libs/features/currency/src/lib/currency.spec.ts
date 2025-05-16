import { CurrencyConverter } from './converter';
import {
  CASH_PER_CHUCKRAM,
  CHUCKRAMS_PER_CRORE,
} from '@digital-chuckram/types';

describe('CurrencyConverter', () => {
  describe('cashToDenomination', () => {
    it('should convert cash to denomination breakdown', () => {
      const cash = 1000n;
      const result = CurrencyConverter.cashToDenomination(cash);

      expect(result).toEqual({
        crores: 0n,
        lakhs: 0n,

        varahas: 0n,
        fanams: 15n,
        chuckrams: 2n,
        cash: 8n,
      });
    });

    it('should handle large amounts', () => {
      const cashPerCrore = BigInt(CHUCKRAMS_PER_CRORE * CASH_PER_CHUCKRAM);
      const cash = cashPerCrore * 2n + 12345n;
      const result = CurrencyConverter.cashToDenomination(cash);

      expect(result.crores).toBe(2n);
      expect(result.cash + result.chuckrams * 16n + result.fanams * 64n).toBe(
        12345n
      );
    });

    it('should handle zero', () => {
      const result = CurrencyConverter.cashToDenomination(0n);

      expect(result).toEqual({
        crores: 0n,
        lakhs: 0n,
        varahas: 0n,
        fanams: 0n,
        chuckrams: 0n,
        cash: 0n,
      });
    });
  });

  describe('denominationToCash', () => {
    it('should convert denomination to total cash', () => {
      const denom = {
        crores: 0n,
        lakhs: 0n,
        varahas: 1n,
        fanams: 2n,
        chuckrams: 3n,
        cash: 4n,
      };

      const expected = 1024n + 128n + 48n + 4n; // 1 varaha + 2 fanams + 3 chuckrams + 4 cash
      const result = CurrencyConverter.denominationToCash(denom);

      expect(result).toBe(expected);
    });

    it('should handle all denominations', () => {
      const denom = {
        crores: 1n,
        lakhs: 2n,
        varahas: 3n,
        fanams: 4n,
        chuckrams: 5n,
        cash: 6n,
      };

      const result = CurrencyConverter.denominationToCash(denom);
      const backToDenom = CurrencyConverter.cashToDenomination(result);

      expect(backToDenom).toEqual(denom);
    });
  });

  describe('conversion methods', () => {
    it('should convert cash to chuckrams', () => {
      expect(CurrencyConverter.cashToChuckrams(16n)).toBe(1n);
      expect(CurrencyConverter.cashToChuckrams(100n)).toBe(6n); // Rounded down
      expect(CurrencyConverter.cashToChuckrams(15n)).toBe(0n);
    });

    it('should convert chuckrams to cash', () => {
      expect(CurrencyConverter.chuckramsToCash(1n)).toBe(16n);
      expect(CurrencyConverter.chuckramsToCash(10n)).toBe(160n);
    });

    it('should convert chuckrams to fanams', () => {
      expect(CurrencyConverter.chuckramsToFanams(4n)).toBe(1n);
      expect(CurrencyConverter.chuckramsToFanams(15n)).toBe(3n); // Rounded down
    });

    it('should convert fanams to chuckrams', () => {
      expect(CurrencyConverter.fanamsToChuckrams(1n)).toBe(4n);
      expect(CurrencyConverter.fanamsToChuckrams(10n)).toBe(40n);
    });
  });

  describe('formatDenomination', () => {
    it('should format denomination for display', () => {
      const denom = {
        crores: 1n,
        lakhs: 2n,
        varahas: 3n,
        fanams: 4n,
        chuckrams: 5n,
        cash: 6n,
      };

      const result = CurrencyConverter.formatDenomination(denom);
      expect(result).toBe('1 Cr 2 L 3 V 4 F 5 ₹C 6 c');
    });

    it('should skip zero values', () => {
      const denom = {
        crores: 0n,
        lakhs: 0n,
        varahas: 0n,
        fanams: 4n,
        chuckrams: 0n,
        cash: 6n,
      };

      const result = CurrencyConverter.formatDenomination(denom);
      expect(result).toBe('4 F 6 c');
    });

    it('should show 0 c for all zeros', () => {
      const denom = {
        crores: 0n,
        lakhs: 0n,
        varahas: 0n,
        fanams: 0n,
        chuckrams: 0n,
        cash: 0n,
      };

      const result = CurrencyConverter.formatDenomination(denom);
      expect(result).toBe('0 c');
    });
  });

  describe('parseAmount', () => {
    it('should parse amount strings with units', () => {
      expect(CurrencyConverter.parseAmount('100 ₹C')).toBe(1600n);
      expect(CurrencyConverter.parseAmount('50 F')).toBe(3200n);
      expect(CurrencyConverter.parseAmount('1 Cr')).toBe(160000000n);
      expect(CurrencyConverter.parseAmount('5 cash')).toBe(5n);
    });

    it('should handle decimal values', () => {
      expect(CurrencyConverter.parseAmount('1.5 ₹C')).toBe(16n); // Rounded down to 1
      expect(CurrencyConverter.parseAmount('2.9 F')).toBe(128n); // Rounded down to 2
    });

    it('should handle different unit formats', () => {
      expect(CurrencyConverter.parseAmount('100 chuckrams')).toBe(1600n);
      expect(CurrencyConverter.parseAmount('5 FANAMS')).toBe(320n);
      expect(CurrencyConverter.parseAmount('1 lakh')).toBe(1600000n);
    });

    it('should throw on invalid format', () => {
      expect(() => CurrencyConverter.parseAmount('invalid')).toThrow();
      expect(() => CurrencyConverter.parseAmount('100')).toThrow();
      expect(() => CurrencyConverter.parseAmount('100 XYZ')).toThrow();
    });
  });

  describe('convert', () => {
    it('should create complete conversion result from cash', () => {
      const result = CurrencyConverter.convert(12345n);

      expect(result.amount).toBe(12345n);
      expect(result.formatted).toBe('192 F 4 ₹C 9 c');
      expect(CurrencyConverter.denominationToCash(result.denomination)).toBe(
        12345n
      );
    });

    it('should create conversion result from string', () => {
      const result = CurrencyConverter.convert('100 ₹C');

      expect(result.amount).toBe(1600n);
      expect(result.formatted).toBe('100 ₹C');
      expect(CurrencyConverter.denominationToCash(result.denomination)).toBe(
        1600n
      );
    });
  });
});
