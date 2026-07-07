import Decimal from 'decimal.js';

export function toDecimal(value: number | string): Decimal {
  return new Decimal(value);
}

export function formatCarats(carats: Decimal | number | string): string {
  const d = carats instanceof Decimal ? carats : new Decimal(carats);
  return d.toFixed(3);
}
