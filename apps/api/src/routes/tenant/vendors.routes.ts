import { Router } from 'express';
import { requirePermission, requireAnyPermission } from '../../middleware/require-permission.js';
import {
  listVendorsHandler,
  getVendorHandler,
  createVendorHandler,
  updateVendorHandler,
  deleteVendorHandler,
} from '../../controllers/tenant/vendors.controller.js';

const router = Router();

router.get('/', requireAnyPermission('vendor:list', 'vendor:view'), listVendorsHandler);
router.get('/:id', requirePermission('vendor:view'), getVendorHandler);
router.post('/', requirePermission('vendor:create'), createVendorHandler);
router.put('/:id', requirePermission('vendor:update'), updateVendorHandler);
router.delete('/:id', requirePermission('vendor:delete'), deleteVendorHandler);

export default router;
