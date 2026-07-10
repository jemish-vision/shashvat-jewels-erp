import { Router } from 'express';
import { requirePermission, requireAnyPermission } from '../../middleware/require-permission.js';
import * as rolesController from '../../controllers/tenant/roles.controller.js';

const router = Router();

router.get('/', requireAnyPermission('role:list', 'role:view'), rolesController.list);
router.get('/:id', requireAnyPermission('role:list', 'role:view'), rolesController.getById);
router.post('/', requirePermission('role:create'), rolesController.create);
router.put('/:id', requirePermission('role:update'), rolesController.update);
router.delete('/:id', requirePermission('role:delete'), rolesController.remove);

export default router;
