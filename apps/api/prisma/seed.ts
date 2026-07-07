import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 12);

  const superAdmin = await prisma.superAdmin.upsert({
    where: { email: 'admin@shashvat.com' },
    update: {},
    create: {
      email: 'admin@shashvat.com',
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
