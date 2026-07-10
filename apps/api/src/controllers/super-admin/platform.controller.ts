import { Request, Response, NextFunction } from 'express';
import * as companyService from '../../services/company.service.js';

export async function getDashboard(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await companyService.getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
}

export async function getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await companyService.getAuditLog({
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      skip: req.query.skip ? Number(req.query.skip) : undefined,
      targetType: req.query.targetType as string | undefined,
      action: req.query.action as string | undefined,
      adminSearch: req.query.adminSearch as string | undefined,
    });
    res.json({ success: true, data: { items: result.data, pageInfo: result.pageInfo } });
  } catch (err) {
    next(err);
  }
}

export async function getAuditEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const entry = await companyService.getAuditEntry(req.params.id!);
    res.json({ success: true, data: entry });
  } catch (err) {
    next(err);
  }
}
