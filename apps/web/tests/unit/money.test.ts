import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { toDecimal, formatMoney } from '@/lib/money';

describe('toDecimal', () => {
  it('converts number to Decimal', () => {
    const d = toDecimal(10.5);
    expect(d instanceof Decimal).toBe(true);
    expect(d.toFixed(2)).toBe('10.50');
  });

  it('converts string to Decimal', () => {
    const d = toDecimal('1234.56');
    expect(d.toFixed(2)).toBe('1234.56');
  });
});

describe('formatMoney', () => {
  it('formats INR with ₹ symbol', () => {
    expect(formatMoney(1234567.89)).toBe('₹12,34,567.89');
  });

  it('handles Decimal input', () => {
    const d = new Decimal('50000');
    expect(formatMoney(d)).toBe('₹50,000.00');
  });

  it('handles zero', () => {
    expect(formatMoney(0)).toBe('₹0.00');
  });
});
