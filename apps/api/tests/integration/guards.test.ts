import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../../src/app.js';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-never-use-in-production';

let adminToken: string;

beforeAll(async () => {
  const hash = await bcrypt.hash('admin123', 12);
  await prisma.superAdmin.create({
    data: { email: 'admin@guards.test', passwordHash: hash, name: 'Admin', role: 'SUPER_ADMIN' },
  });
  const res = await request(app).post('/api/auth/login').send({ email: 'admin@guards.test', password: 'admin123' });
  adminToken = res.body.data.accessToken;
});

describe('guard: super-admin routes', () => {
  const protectedRoutes = [
    { method: 'get' as const, path: '/api/super-admin/companies' },
    { method: 'post' as const, path: '/api/super-admin/companies', body: { name: 'X', slug: 'x' } },
    { method: 'get' as const, path: '/api/super-admin/dashboard' },
    { method: 'get' as const, path: '/api/super-admin/audit-log' },
  ];

  for (const route of protectedRoutes) {
    it(`${route.method.toUpperCase()} ${route.path} blocks unauthenticated requests`, async () => {
      const req = (request(app) as any)[route.method](route.path);
      if (route.body) req.send(route.body);
      const res = await req;
      expect(res.status).toBe(401);
    });
  }

  it('allows authenticated super admin', async () => {
    const res = await request(app).get('/api/super-admin/dashboard').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it('blocks expired token', async () => {
    const expiredToken = jwt.sign(
      { userId: 'any', companyId: null, branchId: null, role: 'SUPER_ADMIN', permissions: [] },
      JWT_SECRET,
      { expiresIn: '0s' },
    );
    await new Promise((r) => setTimeout(r, 100));
    const res = await request(app)
      .get('/api/super-admin/companies')
      .set('Authorization', `Bearer ${expiredToken}`);
    expect(res.status).toBe(401);
  });

  it('blocks tenant-shaped token (companyId set, role USER)', async () => {
    const tenantToken = jwt.sign(
      { userId: 'tenant-user', companyId: 'company-1', branchId: 'branch-1', role: 'USER', permissions: [] },
      JWT_SECRET,
      { expiresIn: '15m' },
    );
    const res = await request(app)
      .get('/api/super-admin/dashboard')
      .set('Authorization', `Bearer ${tenantToken}`);
    expect(res.status).toBe(403);
  });

  it('blocks token without Bearer prefix', async () => {
    const res = await request(app).get('/api/super-admin/companies').set('Authorization', adminToken);
    expect(res.status).toBe(401);
  });

  it('blocks wrong secret token', async () => {
    const wrongToken = jwt.sign(
      { userId: 'any', companyId: null, branchId: null, role: 'SUPER_ADMIN', permissions: [] },
      'different-secret',
      { expiresIn: '15m' },
    );
    const res = await request(app)
      .get('/api/super-admin/companies')
      .set('Authorization', `Bearer ${wrongToken}`);
    expect(res.status).toBe(401);
  });
});

describe('guard: auth/me endpoint', () => {
  it('blocks without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('allows with valid token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});
