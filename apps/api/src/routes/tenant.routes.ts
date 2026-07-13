import { Router } from 'express';
import { requirePermission, requireAnyPermission } from '../middleware/require-permission.js';
import * as companyController from '../controllers/tenant/company.controller.js';
import dashboardRoutes from './tenant/dashboard.routes.js';
import rolesRoutes from './tenant/roles.routes.js';
import branchesRoutes from './tenant/branches.routes.js';
import teamRoutes from './tenant/team.routes.js';
import customersRoutes from './tenant/customers.routes.js';
import vendorsRoutes from './tenant/vendors.routes.js';
import settingsRoutes from './tenant/settings.routes.js';
import currenciesRoutes from './tenant/currencies.routes.js';
import uploadsRoutes from './tenant/uploads.routes.js';

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

// Mount master data routes (Module 04)
router.use('/customers', customersRoutes);
router.use('/vendors', vendorsRoutes);
router.use('/currencies', currenciesRoutes);

// Settings routes (sequences, etc.)
router.use('/settings', settingsRoutes);

// Media Uploads
router.use('/uploads', uploadsRoutes);

// Company profile settings routes
router.get('/company', requireAnyPermission('settings:view', 'settings:update'), companyController.getProfile);
router.patch('/company', requirePermission('settings:update'), companyController.updateProfile);

export default router;
