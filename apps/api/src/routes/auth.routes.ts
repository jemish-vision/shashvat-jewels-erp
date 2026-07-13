import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.me);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Temporary debug: dumps exact session permissions from JWT (no permission guard)
router.get('/debug-session', authenticate, (req, res) => {
  const s = req.session;
  res.json({
    userId: s?.userId,
    role: s?.role,
    companyId: s?.companyId,
    branchId: s?.branchId,
    permissionCount: s?.permissions?.length ?? 0,
    hasRoleList: s?.permissions?.includes('role:list'),
    hasBranchList: s?.permissions?.includes('branch:list'),
    hasUserList: s?.permissions?.includes('user:list'),
    permissions: s?.permissions,
  });
});

export default router;
