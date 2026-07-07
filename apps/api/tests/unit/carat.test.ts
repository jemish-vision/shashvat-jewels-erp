import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { toDecimal, formatCarats } from '../../src/lib/carat.js';

describe('carat helpers', () => {
  describe('toDecimal', () => {
    it('converts number to Decimal', () => {
      const d = toDecimal(1.24);
      expect(d instanceof Decimal).toBe(true);
      expect(d.toFixed(3)).toBe('1.240');
    });
  });

  describe('formatCarats', () => {
    it('formats to 3 decimal places', () => {
      expect(formatCarats(1.5)).toBe('1.500');
      expect(formatCarats('2.05')).toBe('2.050');
    });

    it('handles Decimal input', () => {
      const d = new Decimal('3.124');
      expect(formatCarats(d)).toBe('3.124');
    });
  });
});
