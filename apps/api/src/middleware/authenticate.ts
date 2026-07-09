import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { SessionPayload } from '@shashvat/shared-types';
import { UnauthorizedError } from '../lib/errors.js';

declare global {
  namespace Express {
    interface Request {
      session?: SessionPayload;
      companyId?: string;
      branchId?: string | null;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables.');
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid authorization header');
  }

  const token = header.slice(7);
  try {
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined in environment variables.');
    }
    const payload = jwt.verify(token, JWT_SECRET) as SessionPayload;
    req.session = payload;
    next();
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}
