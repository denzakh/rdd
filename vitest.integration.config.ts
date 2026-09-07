import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

/**
 * Интеграционные тесты на локальной D1 (getPlatformProxy, wrangler).
 * Перед запуском миграции накатывает scripts/ensure-local-db.ts (см. npm scripts).
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['tests/integration/**/*.test.ts'],
    environment: 'node',
    // миграции общие для всей базы — тесты не параллелим
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
})
