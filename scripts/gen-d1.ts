/**
 * Генератор миграции D1 (schema.sql) из реестра полей.
 * Запуск: npm run gen:d1
 * Вывод: migrations/0001_init.sql (совместимо с `wrangler d1 migrations apply`).
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateD1Schema } from '@/shared/lib/registry/d1-schema'

const here = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(here, '..')
const migrationsDir = join(projectRoot, 'migrations')
const outFile = join(migrationsDir, '0001_init.sql')

mkdirSync(migrationsDir, { recursive: true })
writeFileSync(outFile, generateD1Schema(), 'utf8')

// Небольшой отчёт о сгенерированной схеме
console.log(`D1-миграция сгенерирована: ${outFile}`)
console.log(`Размер: ${Buffer.byteLength(generateD1Schema(), 'utf8')} байт`)