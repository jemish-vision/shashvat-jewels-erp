import { ErrorCodes } from '@shashvat/shared-types';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, ErrorCodes.VALIDATION_ERROR, message, details);
  }
}

export class PermissionError extends AppError {
  constructor(message = 'Permission denied') {
    super(403, ErrorCodes.PERMISSION_DENIED, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, ErrorCodes.UNAUTHORIZED, message);
  }
}

export class StockError extends AppError {
  constructor(code: string, message: string) {
    super(409, code, message);
  }
}

export class BusinessRuleError extends AppError {
  constructor(message: string, details?: unknown) {
    super(422, ErrorCodes.BUSINESS_RULE_VIOLATION, message, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(404, ErrorCodes.NOT_FOUND, message);
  }
}

export class DuplicateEntityError extends AppError {
  constructor(message = 'Entity already exists') {
    super(409, ErrorCodes.DUPLICATE_ENTITY, message);
  }
}

export class CompanySuspendedError extends AppError {
  constructor(message = 'Company account is suspended or unavailable') {
    super(403, 'COMPANY_SUSPENDED', message);
  }
}
