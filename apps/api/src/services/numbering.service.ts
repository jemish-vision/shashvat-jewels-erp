import type { PrismaClient } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import type { TxClient } from './audit.service.js';

export interface NextSequenceOptions {
  branchId?: string | null;
  yearly?: boolean;
  padding?: number;
}

/**
 * getNextSequenceCode
 * Atomically increments and formats a number sequence code (e.g. CUST-0001, VEND-0001).
 */
export async function getNextSequenceCode(
  tx: TxClient | PrismaClient = prisma,
  companyId: string,
  key: string,
  defaultPrefix: string,
  options?: NextSequenceOptions
): Promise<string> {
  const year = options?.yearly ? new Date().getFullYear() : 0;
  const branchId = options?.branchId || null;
  const padding = options?.padding ?? 4;

  // Find existing sequence
  const existing = await tx.numberSequence.findFirst({
    where: {
      companyId,
      key,
      branchId,
      year,
    },
  });

  let updated;
  if (existing) {
    updated = await tx.numberSequence.update({
      where: { id: existing.id },
      data: { lastValue: { increment: 1 } },
    });
  } else {
    updated = await tx.numberSequence.create({
      data: {
        companyId,
        key,
        branchId,
        prefix: defaultPrefix,
        year,
        lastValue: 1,
      },
    });
  }

  const formattedNum = String(updated.lastValue).padStart(padding, '0');
  return `${updated.prefix}${formattedNum}`;
}
