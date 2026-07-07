import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime, toISODate } from '@/lib/dates';

describe('dates', () => {
  it('formatDate returns en-IN short format', () => {
    const result = formatDate('2026-07-07');
    expect(result).toContain('Jul');
    expect(result).toContain('2026');
  });

  it('formatDateTime includes time', () => {
    const result = formatDateTime('2026-07-07T10:30:00');
    expect(result).toContain('Jul');
    expect(result).toContain('2026');
    expect(result).toContain('10');
  });

  it('toISODate returns YYYY-MM-DD', () => {
    expect(toISODate('2026-07-07T10:30:00Z')).toBe('2026-07-07');
  });
});
