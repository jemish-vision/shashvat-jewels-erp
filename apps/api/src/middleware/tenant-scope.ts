import { Request, Response, NextFunction } from 'express';
import { PermissionError, CompanySuspendedError } from '../lib/errors.js';
import { prisma } from '../db/prisma.js';

interface CachedCompanyStatus {
  status: string;
  deletedAt: Date | null;
  expiresAt: number;
}

const companyStatusCache = new Map<string, CachedCompanyStatus>();
const CACHE_TTL_MS = 60_000; // 60 seconds

export function clearCompanyStatusCache(companyId?: string) {
  if (companyId) {
    companyStatusCache.delete(companyId);
  } else {
    companyStatusCache.clear();
  }
}

export async function tenantScope(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const session = req.session;
    if (!session || !session.companyId) {
      throw new PermissionError('Tenant access required');
    }

    const now = Date.now();
    let cached = companyStatusCache.get(session.companyId);

    if (!cached || cached.expiresAt <= now) {
      const company = await prisma.company.findUnique({
        where: { id: session.companyId },
        select: { status: true, deletedAt: true },
      });

      if (!company) {
        throw new CompanySuspendedError('Company account not found');
      }

      cached = {
        status: company.status,
        deletedAt: company.deletedAt,
        expiresAt: now + CACHE_TTL_MS,
      };
      companyStatusCache.set(session.companyId, cached);
    }

    if (cached.deletedAt || cached.status === 'SUSPENDED') {
      throw new CompanySuspendedError();
    }

    req.companyId = session.companyId;
    req.branchId = session.branchId ?? null;
    next();
  } catch (err) {
    next(err);
  }
}
