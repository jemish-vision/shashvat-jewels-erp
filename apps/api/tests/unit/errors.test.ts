import { describe, it, expect } from 'vitest';
import {
  AppError, ValidationError, PermissionError, UnauthorizedError,
  StockError, BusinessRuleError, NotFoundError,
} from '../../src/lib/errors.js';
import { ErrorCodes } from '@shashvat/shared-types';

describe('AppError', () => {
  it('creates with status, code, message', () => {
    const err = new AppError(418, 'TEAPOT', "I'm a teapot");
    expect(err.statusCode).toBe(418);
    expect(err.code).toBe('TEAPOT');
    expect(err.message).toBe("I'm a teapot");
    expect(err.name).toBe('AppError');
  });
});

describe('ValidationError', () => {
  it('has 400 + VALIDATION_ERROR', () => {
    const err = new ValidationError('Bad input', { field: 'email' });
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe(ErrorCodes.VALIDATION_ERROR);
    expect(err.details).toEqual({ field: 'email' });
  });
});

describe('PermissionError', () => {
  it('has 403 + PERMISSION_DENIED', () => {
    const err = new PermissionError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe(ErrorCodes.PERMISSION_DENIED);
    expect(err.message).toBe('Permission denied');
  });
});

describe('UnauthorizedError', () => {
  it('has 401 + UNAUTHORIZED', () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe(ErrorCodes.UNAUTHORIZED);
  });
});

describe('StockError', () => {
  it('has 409 + custom code', () => {
    const err = new StockError('STOCK_NOT_AVAILABLE', 'Item is sold');
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('STOCK_NOT_AVAILABLE');
  });
});

describe('BusinessRuleError', () => {
  it('has 422 + BUSINESS_RULE_VIOLATION', () => {
    const err = new BusinessRuleError('Invalid status transition');
    expect(err.statusCode).toBe(422);
    expect(err.code).toBe(ErrorCodes.BUSINESS_RULE_VIOLATION);
  });
});

describe('NotFoundError', () => {
  it('has 404 + NOT_FOUND', () => {
    const err = new NotFoundError();
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe(ErrorCodes.NOT_FOUND);
  });
});
