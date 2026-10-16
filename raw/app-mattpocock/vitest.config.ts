import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 20000,
    hookTimeout: 20000,
    projects: [
      {
        test: {
          name: 'api',
          environment: 'node',
          include: ['server/**/*.test.ts'],
        },
      },
      {
        plugins: [react()],
        test: {
          name: 'ui',
          environment: 'jsdom',
          include: ['client/**/*.test.tsx'],
        },
      },
    ],
  },
});
