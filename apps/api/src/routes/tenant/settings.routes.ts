import { Router } from 'express';
import { requirePermission, requireAnyPermission } from '../../middleware/require-permission.js';
import {
  listSequencesHandler,
  updateSequencePrefixHandler,
} from '../../controllers/tenant/settings.controller.js';

const router = Router();

router.get(
  '/sequences',
  requireAnyPermission('settings:view', 'settings:update', 'sequence:list', 'sequence:view', 'sequence:update'),
  listSequencesHandler
);
router.patch(
  '/sequences/:id',
  requireAnyPermission('settings:update', 'sequence:update'),
  updateSequencePrefixHandler
);

export default router;
