import { Router, Request, Response, NextFunction } from 'express';
import { requirePermission } from '../middleware/require-permission.js';
import { getTenantClient } from '../db/tenant-extension.js';
import { NotFoundError } from '../lib/errors.js';
import dashboardRoutes from './tenant/dashboard.routes.js';

const router = Router();

// Mount dashboard stats route
router.use('/dashboard', dashboardRoutes);

// Probe route: GET own company profile
router.get(
  '/company',
  requirePermission('settings:view'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId!;
      const tenantDb = getTenantClient(companyId);
      const company = await tenantDb.company.findFirst();
      if (!company) {
        throw new NotFoundError('Company not found');
      }
      res.json({ success: true, data: company });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
