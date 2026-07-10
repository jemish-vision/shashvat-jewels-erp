import { Request, Response, NextFunction } from 'express';
import { PermissionError } from '../lib/errors.js';

export function requirePermission(...permissions: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const session = req.session;
    if (!session) {
      throw new PermissionError('Authentication required');
    }
    const hasAll = permissions.every((p) => session.permissions.includes(p));
    if (!hasAll) {
      throw new PermissionError('You do not have permission for this action');
    }
    next();
  };
}

export function requireAnyPermission(...permissions: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const session = req.session;
    if (!session) {
      throw new PermissionError('Authentication required');
    }
    const hasAny = permissions.some((p) => session.permissions.includes(p));
    if (!hasAny) {
      throw new PermissionError('You do not have permission for this action');
    }
    next();
  };
}

export function enforceBranchScope(
  session: { branchId?: string | null },
  requestedBranchId?: string | null
): string | undefined {
  if (!session || session.branchId === null || session.branchId === undefined) {
    return requestedBranchId ?? undefined;
  }
  if (requestedBranchId && requestedBranchId !== session.branchId) {
    throw new PermissionError('Branch scope violation: cannot access data of another branch');
  }
  return session.branchId;
}
