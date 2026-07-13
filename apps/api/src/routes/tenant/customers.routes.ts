import { Router } from 'express';
import { requirePermission, requireAnyPermission } from '../../middleware/require-permission.js';
import {
  listCustomersHandler,
  getCustomerHandler,
  createCustomerHandler,
  updateCustomerHandler,
  deleteCustomerHandler,
} from '../../controllers/tenant/customers.controller.js';

const router = Router();

router.get('/', requireAnyPermission('customer:list', 'customer:view'), listCustomersHandler);
router.get('/:id', requirePermission('customer:view'), getCustomerHandler);
router.post('/', requirePermission('customer:create'), createCustomerHandler);
router.put('/:id', requirePermission('customer:update'), updateCustomerHandler);
router.delete('/:id', requirePermission('customer:delete'), deleteCustomerHandler);

export default router;
