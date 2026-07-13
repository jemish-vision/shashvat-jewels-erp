import { describe, it, expect } from 'vitest';

function formatSequenceCode(prefix: string, nextNumber: number, padding = 4): string {
  const padded = String(nextNumber).padStart(padding, '0');
  return `${prefix}${padded}`;
}

describe('Number Sequence Code Generation', () => {
  it('formats customer sequence codes correctly with 4-digit padding', () => {
    expect(formatSequenceCode('CUST-', 1)).toBe('CUST-0001');
    expect(formatSequenceCode('CUST-', 42)).toBe('CUST-0042');
    expect(formatSequenceCode('CUST-', 1234)).toBe('CUST-1234');
  });

  it('formats vendor sequence codes correctly', () => {
    expect(formatSequenceCode('VEND-', 1)).toBe('VEND-0001');
    expect(formatSequenceCode('VEND-', 999)).toBe('VEND-0999');
  });

  it('formats invoice and memo sequence codes correctly', () => {
    expect(formatSequenceCode('INV-', 15)).toBe('INV-0015');
    expect(formatSequenceCode('MEMO-', 8)).toBe('MEMO-0008');
  });

  it('supports custom padding length', () => {
    expect(formatSequenceCode('PO-', 5, 6)).toBe('PO-000005');
  });
});
