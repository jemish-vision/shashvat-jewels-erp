import type { PrismaClient } from '@prisma/client';

export interface CreateCurrencyOptions {
  companyId: string;
  code?: string;
  name?: string;
  symbol?: string;
  isBase?: boolean;
  rateToBase?: number;
}

export async function createCurrency(prisma: PrismaClient, options: CreateCurrencyOptions) {
  const code = options.code ?? 'USD';
  return prisma.currency.create({
    data: {
      companyId: options.companyId,
      code,
      name: options.name ?? 'US Dollar',
      symbol: options.symbol ?? '$',
      isBase: options.isBase ?? false,
      rateToBase: options.rateToBase ?? 83.5,
    },
  });
}
