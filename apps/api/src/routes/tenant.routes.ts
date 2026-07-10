import { Router } from 'express';
import { requirePermission } from '../middleware/require-permission.js';
import * as companyController from '../controllers/tenant/company.controller.js';
import dashboardRoutes from './tenant/dashboard.routes.js';
import rolesRoutes from './tenant/roles.routes.js';
import branchesRoutes from './tenant/branches.routes.js';
import teamRoutes from './tenant/team.routes.js';

const router = Router();

// Mount dashboard stats route
router.use('/dashboard', dashboardRoutes);

// Mount role & permission management routes
router.use('/roles', rolesRoutes);

// Mount dedicated branch management routes
router.use('/branches', branchesRoutes);

// Mount sub-admins / staff directory routes
router.use('/sub-admins', teamRoutes);
router.use('/admins', teamRoutes); // alias

// Probe route: GET own company profile
router.get('/company', requirePermission('settings:view'), companyController.getProfile);

export default router;
