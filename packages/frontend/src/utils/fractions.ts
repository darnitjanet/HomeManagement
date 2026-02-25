// Common fractions for decimal-to-fraction conversion
const COMMON_FRACTIONS: [number, string][] = [
  [0.125, '1/8'],
  [0.25, '1/4'],
  [0.333, '1/3'],
  [0.375, '3/8'],
  [0.5, '1/2'],
  [0.625, '5/8'],
  [0.667, '2/3'],
  [0.75, '3/4'],
  [0.875, '7/8'],
];

/** Convert a decimal number to a fraction string (e.g. 0.667 → "2/3", 1.5 → "1 1/2") */
export function decimalToFraction(decimal: number | undefined): string {
  if (decimal === undefined || decimal === null) return '';

  const whole = Math.floor(decimal);
  const frac = decimal - whole;

  for (const [value, str] of COMMON_FRACTIONS) {
    if (Math.abs(frac - value) < 0.01) {
      return whole === 0 ? str : `${whole} ${str}`;
    }
  }

  if (Math.abs(frac) < 0.01) {
    return whole.toString();
  }

  return decimal.toString();
}

/** Parse a fraction string to a decimal number (e.g. "2/3" → 0.667, "1 1/2" → 1.5) */
export function parseFraction(str: string): number | undefined {
  if (!str || str.trim() === '') return undefined;

  const trimmed = str.trim();

  const asNumber = parseFloat(trimmed);
  if (!isNaN(asNumber) && !trimmed.includes('/')) {
    return asNumber;
  }

  // Mixed numbers like "1 1/2"
  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1]);
    const num = parseInt(mixedMatch[2]);
    const denom = parseInt(mixedMatch[3]);
    if (denom !== 0) return whole + num / denom;
  }

  // Simple fractions like "1/4"
  const fractionMatch = trimmed.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const num = parseInt(fractionMatch[1]);
    const denom = parseInt(fractionMatch[2]);
    if (denom !== 0) return num / denom;
  }

  return isNaN(asNumber) ? undefined : asNumber;
}
