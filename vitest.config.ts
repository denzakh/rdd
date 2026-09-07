import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

/**
 * Unit-тесты (без БД): tests/unit/**. Интеграционные — tests/integration/**
 * с конфигом vitest.integration.config.ts (локальная D1 через getPlatformProxy).
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
})
