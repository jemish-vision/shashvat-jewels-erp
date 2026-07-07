import Decimal from 'decimal.js';

export function toDecimal(value: number | string): Decimal {
  return new Decimal(value);
}

export function formatMoney(amount: Decimal | number | string, currency = 'INR'): string {
  const d = amount instanceof Decimal ? amount : new Decimal(amount);
  const parts = d.toFixed(2).split('.');
  const int = parts[0]!;
  const frac = parts[1]!;
  const last3 = int.slice(-3);
  const rest = int.slice(0, -3);
  const formatted = rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3 : last3;
  return `${currency === 'INR' ? '₹' : ''}${formatted}.${frac}`;
}

export function calculateMargin(lineTotal: Decimal, costAtSale: Decimal, exchangeRate: Decimal): Decimal {
  return lineTotal.times(exchangeRate).minus(costAtSale);
}
