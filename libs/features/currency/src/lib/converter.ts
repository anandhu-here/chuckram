import {
  CASH_PER_CHUCKRAM,
  CHUCKRAMS_PER_FANAM,
  FANAMS_PER_VARAHA,
  CHUCKRAMS_PER_LAKH,
  CHUCKRAMS_PER_CRORE,
  ChuckramDenomination,
  ConversionResult,
} from '@digital-chuckram/types';

export class CurrencyConverter {
  /**
   * Convert Cash to Chuckram denomination breakdown
   */
  static cashToDenomination(totalCash: bigint): ChuckramDenomination {
    let remaining = totalCash;

    // Calculate each denomination from largest to smallest
    const cashPerCrore = BigInt(CHUCKRAMS_PER_CRORE * CASH_PER_CHUCKRAM);
    const crores = remaining / cashPerCrore;
    remaining = remaining % cashPerCrore;

    const cashPerLakh = BigInt(CHUCKRAMS_PER_LAKH * CASH_PER_CHUCKRAM);
    const lakhs = remaining / cashPerLakh;
    remaining = remaining % cashPerLakh;

    const cashPerVaraha = BigInt(
      FANAMS_PER_VARAHA * CHUCKRAMS_PER_FANAM * CASH_PER_CHUCKRAM
    );
    const varahas = remaining / cashPerVaraha;
    remaining = remaining % cashPerVaraha;

    const cashPerFanam = BigInt(CHUCKRAMS_PER_FANAM * CASH_PER_CHUCKRAM);
    const fanams = remaining / cashPerFanam;
    remaining = remaining % cashPerFanam;

    const cashPerChuckram = BigInt(CASH_PER_CHUCKRAM);
    const chuckrams = remaining / cashPerChuckram;
    const cash = remaining % cashPerChuckram;

    return {
      crores,
      lakhs,
      varahas,
      fanams,
      chuckrams,
      cash,
    };
  }

  /**
   * Convert denomination breakdown to total Cash
   */
  static denominationToCash(denom: ChuckramDenomination): bigint {
    const cashPerCrore = BigInt(CHUCKRAMS_PER_CRORE * CASH_PER_CHUCKRAM);
    const cashPerLakh = BigInt(CHUCKRAMS_PER_LAKH * CASH_PER_CHUCKRAM);
    const cashPerVaraha = BigInt(
      FANAMS_PER_VARAHA * CHUCKRAMS_PER_FANAM * CASH_PER_CHUCKRAM
    );
    const cashPerFanam = BigInt(CHUCKRAMS_PER_FANAM * CASH_PER_CHUCKRAM);
    const cashPerChuckram = BigInt(CASH_PER_CHUCKRAM);

    return (
      denom.crores * cashPerCrore +
      denom.lakhs * cashPerLakh +
      denom.varahas * cashPerVaraha +
      denom.fanams * cashPerFanam +
      denom.chuckrams * cashPerChuckram +
      denom.cash
    );
  }

  /**
   * Convert Cash to Chuckrams (rounded down)
   */
  static cashToChuckrams(cash: bigint): bigint {
    return cash / BigInt(CASH_PER_CHUCKRAM);
  }

  /**
   * Convert Chuckrams to Cash
   */
  static chuckramsToCash(chuckrams: bigint): bigint {
    return chuckrams * BigInt(CASH_PER_CHUCKRAM);
  }

  /**
   * Convert Chuckrams to Fanams (rounded down)
   */
  static chuckramsToFanams(chuckrams: bigint): bigint {
    return chuckrams / BigInt(CHUCKRAMS_PER_FANAM);
  }

  /**
   * Convert Fanams to Chuckrams
   */
  static fanamsToChuckrams(fanams: bigint): bigint {
    return fanams * BigInt(CHUCKRAMS_PER_FANAM);
  }

  /**
   * Format denomination for display
   */
  static formatDenomination(denom: ChuckramDenomination): string {
    const parts: string[] = [];

    if (denom.crores > 0n) parts.push(`${denom.crores} Cr`);
    if (denom.lakhs > 0n) parts.push(`${denom.lakhs} L`);
    if (denom.varahas > 0n) parts.push(`${denom.varahas} V`);
    if (denom.fanams > 0n) parts.push(`${denom.fanams} F`);
    if (denom.chuckrams > 0n) parts.push(`${denom.chuckrams} ₹C`);
    if (denom.cash > 0n) parts.push(`${denom.cash} c`);

    return parts.length > 0 ? parts.join(' ') : '0 c';
  }

  /**
   * Parse amount string with unit (e.g., "100 ₹C", "50 F", "1 Cr")
   */
  static parseAmount(amountStr: string): bigint {
    const match = amountStr.match(/^(\d+\.?\d*)\s*([A-Za-z₹]+)$/);
    if (!match) {
      throw new Error(`Invalid amount format: ${amountStr}`);
    }

    const [, valueStr, unit] = match;
    const value = BigInt(Math.floor(parseFloat(valueStr)));

    switch (unit.toLowerCase()) {
      case 'cr':
      case 'crore':
      case 'crores':
        return value * BigInt(CHUCKRAMS_PER_CRORE * CASH_PER_CHUCKRAM);
      case 'l':
      case 'lakh':
      case 'lakhs':
        return value * BigInt(CHUCKRAMS_PER_LAKH * CASH_PER_CHUCKRAM);
      case 'v':
      case 'varaha':
      case 'varahas':
        return (
          value *
          BigInt(FANAMS_PER_VARAHA * CHUCKRAMS_PER_FANAM * CASH_PER_CHUCKRAM)
        );
      case 'f':
      case 'fanam':
      case 'fanams':
        return value * BigInt(CHUCKRAMS_PER_FANAM * CASH_PER_CHUCKRAM);
      case '₹c':
      case 'c':
      case 'chuckram':
      case 'chuckrams':
        return value * BigInt(CASH_PER_CHUCKRAM);
      case 'cash':
        return value;
      default:
        throw new Error(`Unknown currency unit: ${unit}`);
    }
  }

  /**
   * Create conversion result with all details
   */
  static convert(amount: bigint | string): ConversionResult {
    const cashAmount =
      typeof amount === 'string' ? this.parseAmount(amount) : amount;
    const denomination = this.cashToDenomination(cashAmount);
    const formatted = this.formatDenomination(denomination);

    return {
      amount: cashAmount,
      denomination,
      formatted,
    };
  }
}
