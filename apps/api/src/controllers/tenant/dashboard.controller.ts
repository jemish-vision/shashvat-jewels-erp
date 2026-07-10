import { Request, Response, NextFunction } from 'express';
import * as dashboardService from '../../services/dashboard.service.js';

export async function getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.companyId!;
    const data = await dashboardService.getTenantDashboardSummary(companyId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
