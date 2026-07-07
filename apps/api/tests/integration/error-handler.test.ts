import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { errorHandler } from '../../src/middleware/error-handler.js';
import { ValidationError, PermissionError, StockError, BusinessRuleError } from '../../src/lib/errors.js';
import { ErrorCodes } from '@shashvat/shared-types';

function createTestApp(route: (req: any, res: any, next: any) => void) {
  const app = express();
  app.get('/test', route);
  app.use(errorHandler);
  return app;
}

describe('Error handler envelope', () => {
  it('VALIDATION_ERROR → 400', async () => {
    const app = createTestApp(() => { throw new ValidationError('Bad request', { name: 'required' }); });
    const res = await request(app).get('/test');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe(ErrorCodes.VALIDATION_ERROR);
    expect(res.body.error.message).toBe('Bad request');
    expect(res.body.error.details).toEqual({ name: 'required' });
  });

  it('PERMISSION_DENIED → 403', async () => {
    const app = createTestApp(() => { throw new PermissionError(); });
    const res = await request(app).get('/test');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe(ErrorCodes.PERMISSION_DENIED);
  });

  it('StockError → 409', async () => {
    const app = createTestApp(() => { throw new StockError('STOCK_NOT_AVAILABLE', 'Item sold'); });
    const res = await request(app).get('/test');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('STOCK_NOT_AVAILABLE');
  });

  it('BusinessRuleError → 422', async () => {
    const app = createTestApp(() => { throw new BusinessRuleError('Invalid transition'); });
    const res = await request(app).get('/test');
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe(ErrorCodes.BUSINESS_RULE_VIOLATION);
  });

  it('unknown error → 500 INTERNAL_ERROR', async () => {
    const app = createTestApp(() => { throw new Error('something broke'); });
    const res = await request(app).get('/test');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe(ErrorCodes.INTERNAL_ERROR);
    expect(res.body.error.message).toBe('An unexpected error occurred');
  });
});
