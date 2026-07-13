import { Router } from 'express';
import { requirePermission, requireAnyPermission } from '../../middleware/require-permission.js';
import {
  listCurrenciesHandler,
  createCurrencyHandler,
  updateCurrencyHandler,
  addExchangeRateHandler,
  getRateHistoryHandler,
  deleteCurrencyHandler,
} from '../../controllers/tenant/currencies.controller.js';

const router = Router();

router.get('/', requireAnyPermission('currency:list', 'currency:view', 'currency:create', 'currency:update', 'currency:delete'), listCurrenciesHandler);
router.post('/', requirePermission('currency:create'), createCurrencyHandler);
router.put('/:id', requirePermission('currency:update'), updateCurrencyHandler);
router.delete('/:id', requirePermission('currency:delete'), deleteCurrencyHandler);
router.post('/:id/rates', requirePermission('currency:update'), addExchangeRateHandler);
router.get('/:id/rates', requireAnyPermission('currency:list', 'currency:view', 'currency:create', 'currency:update'), getRateHistoryHandler);

export default router;
