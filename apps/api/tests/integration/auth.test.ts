import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import app from '../../src/app.js';

const prisma = new PrismaClient();

const TEST_EMAIL = 'super@test.com';
const TEST_PASSWORD = 'password123';

async function seedSuperAdmin() {
  const hash = await bcrypt.hash(TEST_PASSWORD, 12);
  return prisma.superAdmin.create({
    data: { email: TEST_EMAIL, passwordHash: hash, name: 'Test Admin', role: 'SUPER_ADMIN' },
  });
}

describe('POST /api/auth/login', () => {
  beforeAll(async () => {
    await seedSuperAdmin();
  });

  it('returns tokens for valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.session).toBeDefined();
    expect(res.body.data.session.role).toBe('SUPER_ADMIN');
    expect(res.body.data.session.companyId).toBeNull();
  });

  it('returns 401 for wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: TEST_EMAIL, password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns 401 for unknown email', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'unknown@test.com', password: 'password123' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns 401 for inactive super admin', async () => {
    const hash = await bcrypt.hash('disabled123', 12);
    await prisma.superAdmin.create({
      data: { email: 'disabled@test.com', passwordHash: hash, name: 'Disabled', role: 'SUPER_ADMIN', isActive: false },
    });
    const res = await request(app).post('/api/auth/login').send({ email: 'disabled@test.com', password: 'disabled123' });
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid email format', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'bad', password: 'password123' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for empty password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: TEST_EMAIL, password: '' });
    expect(res.status).toBe(400);
  });

  it('writes audit log on LOGIN_FAILED', async () => {
    await request(app).post('/api/auth/login').send({ email: TEST_EMAIL, password: 'wrong' });
    const log = await prisma.platformAuditLog.findFirst({ where: { action: 'LOGIN_FAILED' } });
    expect(log).not.toBeNull();
    expect(log!.after).toMatchObject({ email: TEST_EMAIL });
  });

  it('writes audit log on successful LOGIN', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    const log = await prisma.platformAuditLog.findFirst({ where: { action: 'LOGIN', targetType: 'SuperAdmin' } });
    expect(log).not.toBeNull();
    expect(log!.targetId).toBe(res.body.data.session.userId);
  });
});

describe('POST /api/auth/refresh', () => {
  let refreshToken: string;

  beforeAll(async () => {
    const admin = await seedSuperAdmin();
    const res = await request(app).post('/api/auth/login').send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    refreshToken = res.body.data.refreshToken;
  });

  it('returns new tokens for valid refresh token', async () => {
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.refreshToken).not.toBe(refreshToken);
  });

  it('rejects invalid refresh token', async () => {
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: 'fake-token' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');
  });

  it('rejects empty token', async () => {
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: '' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/logout', () => {
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    await seedSuperAdmin();
    const res = await request(app).post('/api/auth/login').send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    accessToken = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
  });

  it('revokes refresh token on logout', async () => {
    await request(app).post('/api/auth/logout').send({ refreshToken }).set('Authorization', `Bearer ${accessToken}`);
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(401);
  });

  it('returns success even with already-revoked token', async () => {
    const res = await request(app).post('/api/auth/logout').send({ refreshToken: 'already-gone' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/auth/me', () => {
  let accessToken: string;

  beforeAll(async () => {
    const admin = await seedSuperAdmin();
    const res = await request(app).post('/api/auth/login').send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    accessToken = res.body.data.accessToken;
  });

  it('returns session for authenticated user', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(TEST_EMAIL);
    expect(res.body.data.role).toBe('SUPER_ADMIN');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with invalid token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer invalid');
    expect(res.status).toBe(401);
  });
});
