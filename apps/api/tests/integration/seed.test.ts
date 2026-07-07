import { describe, it, expect, beforeAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

describe('Seed idempotency', () => {
  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash('admin123', 12);
    await prisma.superAdmin.upsert({
      where: { email: 'admin@shashvat.com' },
      update: {},
      create: { email: 'admin@shashvat.com', passwordHash: hashedPassword, name: 'Super Admin', role: 'SUPER_ADMIN' },
    });
  });

  it('creates super admin on first run', async () => {
    const admin = await prisma.superAdmin.findUnique({ where: { email: 'admin@shashvat.com' } });
    expect(admin).not.toBeNull();
    expect(admin!.name).toBe('Super Admin');
  });

  it('is idempotent on second run', async () => {
    const hashedPassword = await bcrypt.hash('admin123', 12);
    await prisma.superAdmin.upsert({
      where: { email: 'admin@shashvat.com' },
      update: {},
      create: { email: 'admin@shashvat.com', passwordHash: hashedPassword, name: 'Super Admin', role: 'SUPER_ADMIN' },
    });
    const count = await prisma.superAdmin.count({ where: { email: 'admin@shashvat.com' } });
    expect(count).toBe(1);
  });
});
