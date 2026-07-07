import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { toDecimal, formatCarats } from '@/lib/carat';

describe('toDecimal', () => {
  it('converts number to Decimal', () => {
    const d = toDecimal(1.5);
    expect(d instanceof Decimal).toBe(true);
  });
});

describe('formatCarats', () => {
  it('formats to 3 decimal places', () => {
    expect(formatCarats(1.5)).toBe('1.500');
  });

  it('handles Decimal input', () => {
    const d = new Decimal('2.1234');
    expect(formatCarats(d)).toBe('2.123');
  });

  it('handles zero', () => {
    expect(formatCarats(0)).toBe('0.000');
  });
});
