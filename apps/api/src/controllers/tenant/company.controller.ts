import { Request, Response, NextFunction } from 'express';
import * as tenantCompanyService from '../../services/tenant-company.service.js';

export async function getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.companyId!;
    const company = await tenantCompanyService.getTenantCompanyProfile(companyId);
    res.json({ success: true, data: company });
  } catch (err) {
    next(err);
  }
}
