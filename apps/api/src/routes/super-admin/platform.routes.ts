import { Router } from 'express';
import * as companyService from '../../services/company.service.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireSuperAdmin } from '../../middleware/require-super-admin.js';

const router = Router();

router.use(authenticate, requireSuperAdmin);

router.get('/dashboard', async (_req, res, next) => {
  try {
    const stats = await companyService.getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

router.get('/audit-log', async (req, res, next) => {
  try {
    const result = await companyService.getAuditLog({
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      cursor: req.query.cursor as string | undefined,
      targetType: req.query.targetType as string | undefined,
      action: req.query.action as string | undefined,
    });
    res.json({ success: true, data: { items: result.data, pageInfo: result.pageInfo } });
  } catch (err) {
    next(err);
  }
});

export default router;
