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
