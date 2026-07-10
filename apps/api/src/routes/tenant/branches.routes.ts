import { Router } from 'express';
import { requirePermission } from '../../middleware/require-permission.js';
import * as branchesController from '../../controllers/tenant/branches.controller.js';

const router = Router();

router.get('/', requirePermission('branch:view'), branchesController.list);
router.post('/', requirePermission('branch:create'), branchesController.create);
router.put('/:id', requirePermission('branch:update'), branchesController.update);
router.delete('/:id', requirePermission('branch:delete'), branchesController.remove);

export default router;
