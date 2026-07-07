import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors.js';
import { ErrorCodes } from '@shashvat/shared-types';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'An unexpected error occurred',
    },
  });
}
