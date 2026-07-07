import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://shashvat:shashvat_dev@localhost:5432/shashvat_test';

process.env.DATABASE_URL = TEST_DATABASE_URL;

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiDir = resolve(__dirname, '../..');
const schemaDir = resolve(apiDir, 'prisma/schema');
const prismaCli = resolve(apiDir, 'node_modules/.bin/prisma');

beforeAll(() => {
  // Clean all tables without dropping schema
execSync(
  `"${prismaCli}" db push --schema="${schemaDir}" --skip-generate --force-reset --accept-data-loss`,
  { cwd: apiDir, env: { ...process.env, CI: 'true', DATABASE_URL: TEST_DATABASE_URL }, stdio: 'pipe' },
);
});

afterEach(async () => {
  const prisma = new PrismaClient();
  try {
    const tableNames = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;
    for (const { tablename } of tableNames) {
      if (tablename !== '_prisma_migrations') {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
});
