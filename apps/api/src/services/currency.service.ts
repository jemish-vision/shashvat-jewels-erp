import { prisma } from '../db/prisma.js';
import { getTenantClient } from '../db/tenant-extension.js';
import { BusinessRuleError, NotFoundError } from '../lib/errors.js';
import { writeAudit } from './audit.service.js';

export async function listCurrencies(companyId: string) {
  const tenantDb = getTenantClient(companyId);
  const currencies = await tenantDb.currency.findMany({
    orderBy: [{ isBase: 'desc' }, { code: 'asc' }],
    include: {
      ratesFrom: {
        orderBy: { effectiveDate: 'desc' },
        take: 1,
      },
    },
  });

  return currencies.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
    symbol: c.symbol,
    decimals: c.decimals,
    isBase: c.isBase,
    isActive: c.isActive,
    latestRate: c.isBase ? 1 : c.ratesFrom[0] ? Number(c.ratesFrom[0].rateToBase) : null,
    latestRateDate: c.ratesFrom[0]?.effectiveDate || null,
  }));
}

export async function createCurrency(
  companyId: string,
  userId: string | null,
  input: {
    code: string;
    name: string;
    symbol: string;
    decimals?: number;
    isBase?: boolean;
    initialRate?: number;
  }
) {
  return prisma.$transaction(async (tx) => {
    const existingCode = await tx.currency.findUnique({
      where: {
        companyId_code: {
          companyId,
          code: input.code.toUpperCase().trim(),
        },
      },
    });

    if (existingCode) {
      throw new BusinessRuleError('Currency code already exists for this company');
    }

    if (input.isBase) {
      await tx.currency.updateMany({
        where: { companyId, isBase: true },
        data: { isBase: false },
      });
    }

    const created = await tx.currency.create({
      data: {
        companyId,
        code: input.code.toUpperCase().trim(),
        name: input.name.trim(),
        symbol: input.symbol.trim(),
        decimals: input.decimals ?? 2,
        isBase: input.isBase ?? false,
        isActive: true,
      },
    });

    if (!created.isBase && input.initialRate && input.initialRate > 0) {
      await tx.exchangeRate.create({
        data: {
          currencyId: created.id,
          rateToBase: input.initialRate,
          effectiveDate: new Date(),
        },
      });
    }

    await writeAudit(tx, {
      companyId,
      userId,
      action: 'CREATE',
      entityType: 'CURRENCY',
      entityId: created.id,
      after: created,
    });

    return created;
  });
}

export async function updateCurrency(
  companyId: string,
  userId: string | null,
  id: string,
  input: {
    name?: string;
    symbol?: string;
    decimals?: number;
    isActive?: boolean;
  }
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.currency.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      throw new NotFoundError('Currency not found');
    }

    if (existing.isBase && input.isActive === false) {
      throw new BusinessRuleError('Base currency cannot be deactivated');
    }

    const updated = await tx.currency.update({
      where: { id: existing.id },
      data: {
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(input.symbol !== undefined && { symbol: input.symbol.trim() }),
        ...(input.decimals !== undefined && { decimals: input.decimals }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });

    await writeAudit(tx, {
      companyId,
      userId,
      action: 'UPDATE',
      entityType: 'CURRENCY',
      entityId: updated.id,
      before: existing,
      after: updated,
    });

    return updated;
  });
}

export async function addExchangeRate(
  companyId: string,
  userId: string | null,
  currencyId: string,
  rateToBase: number,
  effectiveDate: Date = new Date()
) {
  return prisma.$transaction(async (tx) => {
    const currency = await tx.currency.findFirst({
      where: { id: currencyId, companyId },
    });

    if (!currency) {
      throw new NotFoundError('Currency not found');
    }

    if (currency.isBase) {
      throw new BusinessRuleError('Base currency rate is always 1');
    }

    const dateOnly = new Date(
      effectiveDate.getFullYear(),
      effectiveDate.getMonth(),
      effectiveDate.getDate()
    );

    const upserted = await tx.exchangeRate.upsert({
      where: {
        currencyId_effectiveDate: {
          currencyId,
          effectiveDate: dateOnly,
        },
      },
      update: { rateToBase },
      create: {
        currencyId,
        rateToBase,
        effectiveDate: dateOnly,
      },
    });

    await writeAudit(tx, {
      companyId,
      userId,
      action: 'ADD_EXCHANGE_RATE',
      entityType: 'CURRENCY',
      entityId: currency.id,
      after: upserted,
    });

    return upserted;
  });
}

export async function getExchangeRateHistory(companyId: string, currencyId: string) {
  const currency = await prisma.currency.findFirst({
    where: { id: currencyId, companyId },
  });

  if (!currency) {
    throw new NotFoundError('Currency not found');
  }

  const rates = await prisma.exchangeRate.findMany({
    where: { currencyId },
    orderBy: { effectiveDate: 'desc' },
    take: 100,
  });

  return {
    currency: { id: currency.id, code: currency.code, isBase: currency.isBase },
    rates,
  };
}

/**
 * Helper exported for future modules (06/07)
 */
export async function getLatestExchangeRate(companyId: string, currencyCode: string): Promise<number> {
  const currency = await prisma.currency.findFirst({
    where: {
      companyId,
      code: currencyCode.toUpperCase(),
      isActive: true,
    },
    include: {
      ratesFrom: {
        orderBy: { effectiveDate: 'desc' },
        take: 1,
      },
    },
  });

  if (!currency) return 1;
  if (currency.isBase) return 1;
  return currency.ratesFrom[0] ? Number(currency.ratesFrom[0].rateToBase) : 1;
}

export async function deleteCurrency(
  companyId: string,
  userId: string | null,
  currencyId: string
) {
  return prisma.$transaction(async (tx) => {
    const currency = await tx.currency.findFirst({
      where: { id: currencyId, companyId },
    });

    if (!currency) {
      throw new NotFoundError('Currency not found');
    }

    // If deleting base currency and other currencies exist, promote another one to base
    if (currency.isBase) {
      const nextCurrency = await tx.currency.findFirst({
        where: { companyId, id: { not: currencyId } },
      });
      if (nextCurrency) {
        await tx.currency.update({
          where: { id: nextCurrency.id },
          data: { isBase: true },
        });
      }
    }

    // Delete exchange rate history first, then the currency
    await tx.exchangeRate.deleteMany({ where: { currencyId } });
    await tx.currency.delete({ where: { id: currencyId } });

    await writeAudit(tx, {
      companyId,
      userId,
      action: 'DELETE_CURRENCY',
      entityType: 'CURRENCY',
      entityId: currencyId,
      before: currency,
    });

    return { success: true };
  });
}

