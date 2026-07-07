import { Request, Response, NextFunction } from 'express';
import { PermissionError } from '../lib/errors.js';

export function requireSuperAdmin(req: Request, _res: Response, next: NextFunction): void {
  const session = req.session;
  if (!session || session.role !== 'SUPER_ADMIN') {
    throw new PermissionError('Super Admin access required');
  }
  next();
}
