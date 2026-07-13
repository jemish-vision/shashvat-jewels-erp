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

export async function updateProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const companyId = req.companyId!;
    const userId = req.session?.userId || null;
    const { name, phone, address, city, taxId, logoUrl } = req.body;

    const updated = await tenantCompanyService.updateTenantCompanyProfile(
      companyId,
      userId,
      {
        name,
        phone,
        address,
        city,
        taxId,
        logoUrl,
      }
    );
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}
