import { Router } from 'express';
import * as companyController from '../../controllers/super-admin/companies.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireSuperAdmin } from '../../middleware/require-super-admin.js';

const router = Router();

router.use(authenticate, requireSuperAdmin);

router.get('/', companyController.list);
router.post('/', companyController.create);
router.get('/:id', companyController.get);
router.patch('/:id', companyController.update);
router.post('/:id/suspend', companyController.suspend);
router.post('/:id/reactivate', companyController.reactivate);
router.delete('/:id', companyController.remove);

export default router;
