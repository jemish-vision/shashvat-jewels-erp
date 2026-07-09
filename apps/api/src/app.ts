import express, { type Express } from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/error-handler.js';
import authRoutes from './routes/auth.routes.js';
import companyRoutes from './routes/super-admin/companies.routes.js';
import platformRoutes from './routes/super-admin/platform.routes.js';
import tenantRoutes from './routes/tenant.routes.js';
import { authenticate } from './middleware/authenticate.js';
import { tenantScope } from './middleware/tenant-scope.js';

const app: Express = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/super-admin/companies', companyRoutes);
app.use('/api/super-admin', platformRoutes);
app.use('/api/tenant', authenticate, tenantScope, tenantRoutes);

app.use(errorHandler);

export default app;
