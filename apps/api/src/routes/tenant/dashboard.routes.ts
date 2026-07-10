import { Router } from 'express';
import * as dashboardController from '../../controllers/tenant/dashboard.controller.js';

const router = Router();

router.get('/summary', dashboardController.getSummary);

export default router;
