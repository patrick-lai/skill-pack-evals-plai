import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@bench/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    pool: 'forks',
    execArgv: ['--experimental-sqlite', '--disable-warning=ExperimentalWarning'],
    fileParallelism: false,
  },
})
