import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_SUPER_ADMIN_EMAIL || 'admin@shashvat.com';
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD || 'admin123';
  const hashedPassword = await bcrypt.hash(password, 12);

  const superAdmin = await prisma.superAdmin.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash: hashedPassword,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
    },
  });

  console.log('Super admin created:', superAdmin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
