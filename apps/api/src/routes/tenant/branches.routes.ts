import { Router } from 'express';
import { requirePermission, requireAnyPermission } from '../../middleware/require-permission.js';
import * as branchesController from '../../controllers/tenant/branches.controller.js';

const router = Router();

router.get('/', requireAnyPermission('branch:list', 'branch:view'), branchesController.list);
router.post('/', requirePermission('branch:create'), branchesController.create);
router.put('/:id', requirePermission('branch:update'), branchesController.update);
router.delete('/:id', requirePermission('branch:delete'), branchesController.remove);

export default router;
