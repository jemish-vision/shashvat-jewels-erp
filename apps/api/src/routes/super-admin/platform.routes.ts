import { Router } from 'express';
import * as platformController from '../../controllers/super-admin/platform.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireSuperAdmin } from '../../middleware/require-super-admin.js';

const router = Router();

router.use(authenticate, requireSuperAdmin);

router.get('/dashboard', platformController.getDashboard);
router.get('/audit-log', platformController.getAuditLogs);
router.get('/audit-log/:id', platformController.getAuditEntry);

export default router;
