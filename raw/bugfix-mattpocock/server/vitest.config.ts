import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    env: {
      BCRYPT_ROUNDS: '4',
      JWT_SECRET: 'test-secret',
    },
  },
});
