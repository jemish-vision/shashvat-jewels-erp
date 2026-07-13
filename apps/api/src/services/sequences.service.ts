import { prisma } from '../db/prisma.js';
import { getTenantClient } from '../db/tenant-extension.js';
import { NotFoundError } from '../lib/errors.js';
import { writeAudit } from './audit.service.js';

const DEFAULT_SEQUENCES = [
  { key: 'customer', prefix: 'CUST-', yearly: false },
  { key: 'vendor', prefix: 'VEND-', yearly: false },
  { key: 'invoice', prefix: 'INV-', yearly: true },
  { key: 'purchase', prefix: 'PUR-', yearly: true },
  { key: 'memo', prefix: 'MEMO-', yearly: true },
];

export async function listSequences(companyId: string) {
  const tenantDb = getTenantClient(companyId);
  const sequences = await tenantDb.numberSequence.findMany({
    orderBy: [{ key: 'asc' }, { year: 'desc' }],
  });
  return sequences;
}

export async function updateSequencePrefix(
  companyId: string,
  userId: string | null,
  id: string,
  prefix: string
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.numberSequence.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      throw new NotFoundError('Number sequence not found');
    }

    const updated = await tx.numberSequence.update({
      where: { id: existing.id },
      data: { prefix: prefix.trim() },
    });

    await writeAudit(tx, {
      companyId,
      userId,
      action: 'UPDATE_PREFIX',
      entityType: 'NUMBER_SEQUENCE',
      entityId: updated.id,
      before: existing,
      after: updated,
    });

    return updated;
  });
}

export async function seedDefaultSequences(companyId: string) {
  const currentYear = new Date().getFullYear();

  for (const def of DEFAULT_SEQUENCES) {
    const year = def.yearly ? currentYear : 0;
    const existing = await prisma.numberSequence.findFirst({
      where: { companyId, key: def.key, year },
    });

    if (!existing) {
      await prisma.numberSequence.create({
        data: {
          companyId,
          key: def.key,
          prefix: def.prefix,
          year,
          lastValue: 0,
        },
      });
    }
  }
}
