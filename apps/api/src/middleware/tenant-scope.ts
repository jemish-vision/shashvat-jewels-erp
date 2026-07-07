import { Request, Response, NextFunction } from 'express';
import { PermissionError } from '../lib/errors.js';

export function tenantScope(req: Request, _res: Response, next: NextFunction): void {
  const session = req.session;
  if (!session || session.companyId === null) {
    throw new PermissionError('Tenant access required');
  }
  next();
}
