import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { companyListQuery, createCompanySchema, updateCompanySchema } from '../../schemas/company.schema.js';
import * as companyService from '../../services/company.service.js';
import { ValidationError } from '../../lib/errors.js';
import { prisma } from '../../db/prisma.js';

function getIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

async function audit(req: Request, action: string, targetId: string, before?: unknown, after?: unknown) {
  if (!req.session) return;
  await prisma.platformAuditLog.create({
    data: {
      superAdminId: req.session.userId,
      action,
      targetType: 'Company',
      targetId,
      before: before ? JSON.parse(JSON.stringify(before)) : undefined,
      after: after ? JSON.parse(JSON.stringify(after)) : undefined,
      ipAddress: getIp(req),
    },
  });
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const query = companyListQuery.parse(req.query);
    const result = await companyService.listCompanies(query);
    res.json({ success: true, data: { items: result.data, pageInfo: result.pageInfo } });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new ValidationError('Invalid query', err.flatten()));
    next(err);
  }
}

export async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id!;
    const company = await companyService.getCompany(id);
    res.json({ success: true, data: company });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createCompanySchema.parse(req.body);
    const company = await companyService.createCompany(input);
    await audit(req, 'COMPANY_CREATED', company.id, null, company);
    res.status(201).json({ success: true, data: company });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new ValidationError('Invalid input', err.flatten()));
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id!;
    const input = updateCompanySchema.parse(req.body);
    const before = await companyService.getCompany(id).catch(() => null);
    const company = await companyService.updateCompany(id, input);
    await audit(req, 'COMPANY_UPDATED', company.id, before, company);
    res.json({ success: true, data: company });
  } catch (err) {
    if (err instanceof z.ZodError) return next(new ValidationError('Invalid input', err.flatten()));
    next(err);
  }
}

export async function suspend(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id!;
    const before = await companyService.getCompany(id).catch(() => null);
    const company = await companyService.suspendCompany(id);
    await audit(req, 'COMPANY_SUSPENDED', company.id, before, company);
    res.json({ success: true, data: company });
  } catch (err) {
    next(err);
  }
}

export async function reactivate(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id!;
    const before = await companyService.getCompany(id).catch(() => null);
    const company = await companyService.reactivateCompany(id);
    await audit(req, 'COMPANY_REACTIVATED', company.id, before, company);
    res.json({ success: true, data: company });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id!;
    const before = await companyService.getCompany(id).catch(() => null);
    const company = await companyService.deleteCompany(id);
    await audit(req, 'COMPANY_DELETED', company.id, before, company);
    res.json({ success: true, data: company });
  } catch (err) {
    next(err);
  }
}
