import { Router } from 'express';
import { requirePermission } from '../../middleware/require-permission.js';
import * as teamController from '../../controllers/tenant/team.controller.js';

const router = Router();

router.get('/', requirePermission('user:view'), teamController.list);
router.post('/', requirePermission('user:create'), teamController.create);
router.put('/:id', requirePermission('user:update'), teamController.update);
router.delete('/:id', requirePermission('user:delete'), teamController.remove);

export default router;
