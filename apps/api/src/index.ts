import app from './app.js';
import { prisma } from './db/prisma.js';

const PORT = parseInt(process.env.API_PORT || '4000', 10);

async function main(): Promise<void> {
  await prisma.$connect();
  console.log('Connected to database');

  app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
