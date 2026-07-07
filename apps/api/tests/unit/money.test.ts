import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { toDecimal, formatMoney, calculateMargin } from '../../src/lib/money.js';

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

describe('calculateMargin', () => {
  it('returns lineTotal * exchangeRate - costAtSale', () => {
    const lineTotal = new Decimal('100000');
    const costAtSale = new Decimal('80000');
    const exchangeRate = new Decimal('1');
    const margin = calculateMargin(lineTotal, costAtSale, exchangeRate);
    expect(margin.toFixed(2)).toBe('20000.00');
  });

  it('handles foreign currency', () => {
    const lineTotal = new Decimal('1000');
    const costAtSale = new Decimal('60000');
    const exchangeRate = new Decimal('75');
    const margin = calculateMargin(lineTotal, costAtSale, exchangeRate);
    expect(margin.toFixed(2)).toBe('15000.00');
  });
});
