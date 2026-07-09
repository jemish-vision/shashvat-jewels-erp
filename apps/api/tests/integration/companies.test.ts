import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import app from '../../src/app.js';
import { createCompany } from '../factories/company.factory.js';

const prisma = new PrismaClient();

let adminToken: string;

beforeAll(async () => {
  const hash = await bcrypt.hash('admin123', 12);
  await prisma.superAdmin.create({
    data: { email: 'admin@companies.test', passwordHash: hash, name: 'Admin', role: 'SUPER_ADMIN' },
  });
  const res = await request(app).post('/api/auth/login').send({ email: 'admin@companies.test', password: 'admin123' });
  adminToken = res.body.data.accessToken;
});

describe('POST /api/super-admin/companies', () => {
  it('creates company with defaults', async () => {
    const res = await request(app)
      .post('/api/super-admin/companies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'New Corp', slug: 'new-corp' });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('New Corp');
    expect(res.body.data.status).toBe('TRIAL');
  });

  it('returns DUPLICATE_ENTITY for duplicate slug', async () => {
    await createCompany(prisma, { name: 'First', slug: 'dup-slug' });
    const res = await request(app)
      .post('/api/super-admin/companies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Second', slug: 'dup-slug' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_ENTITY');
  });

  it('rejects invalid slug', async () => {
    const res = await request(app)
      .post('/api/super-admin/companies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Bad', slug: 'BAD SLUG!' });
    expect(res.status).toBe(400);
  });

  it('creates audit trail', async () => {
    const res = await request(app)
      .post('/api/super-admin/companies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Audit Test', slug: 'audit-test' });
    const log = await prisma.platformAuditLog.findFirst({ where: { action: 'COMPANY_CREATED', targetId: res.body.data.id } });
    expect(log).not.toBeNull();
  });
});

describe('GET /api/super-admin/companies', () => {
  beforeAll(async () => {
    await createCompany(prisma, { name: 'Alpha', slug: 'alpha' });
    await createCompany(prisma, { name: 'Beta', slug: 'beta' });
  });

  it('lists companies', async () => {
    const res = await request(app).get('/api/super-admin/companies').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(2);
    expect(res.body.data.pageInfo).toBeDefined();
    expect(res.body.data.pageInfo.totalCount).toBeGreaterThanOrEqual(2);
  });

  it('supports cursor pagination', async () => {
    const res = await request(app)
      .get('/api/super-admin/companies?limit=1')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.body.data.items.length).toBe(1);
    expect(res.body.data.pageInfo.hasNextPage).toBe(true);
    expect(res.body.data.pageInfo.nextCursor).toBeDefined();
  });

  it('filters by search', async () => {
    const res = await request(app)
      .get('/api/super-admin/companies?search=Alpha')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.body.data.items.every((c: any) => c.name.includes('Alpha') || c.slug.includes('Alpha'))).toBe(true);
  });
});

describe('GET /api/super-admin/companies/:id', () => {
  it('returns company with counts', async () => {
    const company = await createCompany(prisma, { name: 'Detail Test', slug: `detail-${Date.now()}` });
    const res = await request(app)
      .get(`/api/super-admin/companies/${company.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Detail Test');
    expect(res.body.data._count).toBeDefined();
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app)
      .get('/api/super-admin/companies/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/super-admin/companies/:id', () => {
  it('updates company fields', async () => {
    const company = await createCompany(prisma, { name: 'Before Update', slug: `update-${Date.now()}` });
    const res = await request(app)
      .patch(`/api/super-admin/companies/${company.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'After Update' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('After Update');
  });

  it('rejects slug in body', async () => {
    const company = await createCompany(prisma, { name: 'Slug Reject', slug: `slugreject-${Date.now()}` });
    const res = await request(app)
      .patch(`/api/super-admin/companies/${company.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ slug: 'new-slug' } as any);
    expect(res.status).toBe(400);
  });

  it('writes audit log', async () => {
    const company = await createCompany(prisma, { name: 'Audit Update', slug: `audit-upd-${Date.now()}` });
    await request(app)
      .patch(`/api/super-admin/companies/${company.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Audited' });
    const log = await prisma.platformAuditLog.findFirst({ where: { action: 'COMPANY_UPDATED' } });
    expect(log).not.toBeNull();
  });
});

describe('company lifecycle — suspend/reactivate/delete', () => {
  it('suspends ACTIVE company', async () => {
    const company = await createCompany(prisma, { name: 'To Suspend', slug: `suspend-${Date.now()}` });
    const res = await request(app)
      .post(`/api/super-admin/companies/${company.id}/suspend`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('SUSPENDED');
  });

  it('reactivates SUSPENDED company', async () => {
    const company = await createCompany(prisma, { name: 'To Reactivate', slug: `reactivate-${Date.now()}` });
    await prisma.company.update({ where: { id: company.id }, data: { status: 'SUSPENDED' } });
    const res = await request(app)
      .post(`/api/super-admin/companies/${company.id}/reactivate`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ACTIVE');
  });

  it('rejects double suspend', async () => {
    const company = await createCompany(prisma, { name: 'Double Suspend', slug: `double-sus-${Date.now()}` });
    await prisma.company.update({ where: { id: company.id }, data: { status: 'SUSPENDED' } });
    const res = await request(app)
      .post(`/api/super-admin/companies/${company.id}/suspend`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(422);
  });

  it('rejects reactivate of non-suspended', async () => {
    const company = await createCompany(prisma, { name: 'Non Suspended', slug: `non-sus-${Date.now()}` });
    const res = await request(app)
      .post(`/api/super-admin/companies/${company.id}/reactivate`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(422);
  });

  it('deletes SUSPENDED company (soft)', async () => {
    const company = await createCompany(prisma, { name: 'To Delete', slug: `delete-${Date.now()}` });
    await prisma.company.update({ where: { id: company.id }, data: { status: 'SUSPENDED' } });
    const res = await request(app)
      .delete(`/api/super-admin/companies/${company.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.deletedAt).not.toBeNull();
    expect(res.body.data.status).toBe('CANCELLED');
  });

  it('rejects delete of non-suspended', async () => {
    const company = await createCompany(prisma, { name: 'Active Delete', slug: `active-del-${Date.now()}` });
    const res = await request(app)
      .delete(`/api/super-admin/companies/${company.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(422);
  });

  it('soft-deleted companies hidden by default', async () => {
    const company = await createCompany(prisma, { name: 'Hidden', slug: `hidden-${Date.now()}` });
    await prisma.company.update({ where: { id: company.id }, data: { status: 'SUSPENDED' } });
    await request(app)
      .delete(`/api/super-admin/companies/${company.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    const list = await request(app).get('/api/super-admin/companies').set('Authorization', `Bearer ${adminToken}`);
    const found = list.body.data.items.find((c: any) => c.id === company.id);
    expect(found).toBeUndefined();
  });

  it('shows deleted with includeDeleted=true', async () => {
    const company = await createCompany(prisma, { name: 'Visible', slug: `visible-${Date.now()}` });
    await prisma.company.update({ where: { id: company.id }, data: { status: 'SUSPENDED' } });
    await request(app)
      .delete(`/api/super-admin/companies/${company.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    const list = await request(app)
      .get('/api/super-admin/companies?includeDeleted=true')
      .set('Authorization', `Bearer ${adminToken}`);
    const found = list.body.data.items.find((c: any) => c.id === company.id);
    expect(found).toBeDefined();
  });

  it('each lifecycle action writes audit log', async () => {
    const company = await createCompany(prisma, { name: 'Audit Lifecycle', slug: `audit-life-${Date.now()}` });

    await request(app).post(`/api/super-admin/companies/${company.id}/suspend`).set('Authorization', `Bearer ${adminToken}`);
    let log = await prisma.platformAuditLog.findFirst({ where: { action: 'COMPANY_SUSPENDED', targetId: company.id } });
    expect(log).not.toBeNull();

    await request(app).post(`/api/super-admin/companies/${company.id}/reactivate`).set('Authorization', `Bearer ${adminToken}`);
    log = await prisma.platformAuditLog.findFirst({ where: { action: 'COMPANY_REACTIVATED', targetId: company.id } });
    expect(log).not.toBeNull();

    await prisma.company.update({ where: { id: company.id }, data: { status: 'SUSPENDED' } });
    await request(app).delete(`/api/super-admin/companies/${company.id}`).set('Authorization', `Bearer ${adminToken}`);
    log = await prisma.platformAuditLog.findFirst({ where: { action: 'COMPANY_DELETED', targetId: company.id } });
    expect(log).not.toBeNull();
  });
});
