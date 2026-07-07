import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/integration/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['tests/integration/setup.ts'],
    testTimeout: 30000,
    fileParallelism: false,
  },
});
