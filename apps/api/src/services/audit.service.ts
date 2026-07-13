import { Prisma, type PrismaClient } from '@prisma/client';
import { prisma } from '../db/prisma.js';

export type TxClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export interface WriteAuditInput {
  companyId: string;
  branchId?: string | null;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  ipAddress?: string | null;
}

/**
 * writeAudit
 * Writes an AuditLog entry atomically within a database transaction (or global prisma if tx not passed).
 */
export async function writeAudit(
  tx: TxClient | PrismaClient = prisma,
  input: WriteAuditInput
): Promise<void> {
  await tx.auditLog.create({
    data: {
      companyId: input.companyId,
      branchId: input.branchId || null,
      userId: input.userId || null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      before: input.before ? (input.before as Prisma.InputJsonValue) : Prisma.JsonNull,
      after: input.after ? (input.after as Prisma.InputJsonValue) : Prisma.JsonNull,
      ipAddress: input.ipAddress || null,
    },
  });
}

/**
 * getAuditLogs
 * Retrieves paginated audit logs for a company.
 */
export async function getAuditLogs(
  companyId: string,
  options?: {
    entityType?: string;
    entityId?: string;
    userId?: string;
    action?: string;
    limit?: number;
    cursor?: string;
  }
) {
  const where: Prisma.AuditLogWhereInput = {
    companyId,
    ...(options?.entityType && { entityType: options.entityType }),
    ...(options?.entityId && { entityId: options.entityId }),
    ...(options?.userId && { userId: options.userId }),
    ...(options?.action && { action: options.action }),
  };

  const limit = options?.limit && options.limit > 0 ? Math.min(options.limit, 100) : 50;

  const logs = await prisma.auditLog.findMany({
    where,
    take: limit + 1,
    ...(options?.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  let nextCursor: string | undefined;
  if (logs.length > limit) {
    const nextItem = logs.pop();
    nextCursor = nextItem?.id;
  }

  return { logs, nextCursor };
}
