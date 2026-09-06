/**
 * Полный сброс локальной D1-базы.
 * Запуск: npm run db:restart
 *
 * 1. Удаляет локальное состояние D1 (каталог .wrangler/state/v3/d1);
 * 2. Удаляет снапшот схемы и все файлы миграций (кроме .schema-reference.sql),
 *    чтобы `gen:d1` перегенерировал 0001_init.sql из актуального реестра;
 * 3. Запускает генератор миграций;
 * 4. Применяет миграции к локальной базе (создаёт её заново).
 *
 * Удалённые (remote) ресурсы не затрагиваются.
 */
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(here, '..')
const migrationsDir = join(projectRoot, 'migrations')
const snapshotPath = join(migrationsDir, '.schema-snapshot.json')
const d1StateDir = join(projectRoot, '.wrangler', 'state', 'v3', 'd1')

const run = (cmd: string, opts: { cwd?: string } = {}) => {
  console.log(`> ${cmd}`)
  execSync(cmd, { stdio: 'inherit', cwd: opts.cwd ?? projectRoot })
}

// 1) Сбрасываем локальное состояние D1
if (existsSync(d1StateDir)) {
  rmSync(d1StateDir, { recursive: true, force: true })
  console.log(`🗑  Удалено локальное состояние БД: ${d1StateDir}`)
} else {
  console.log(`ℹ️  Локального состояния БД не было: ${d1StateDir}`)
}

// 2) Удаляем старые миграции и снапшот (кроме служебного .schema-reference.sql)
mkdirSync(migrationsDir, { recursive: true })
for (const f of readdirSync(migrationsDir)) {
  if (f.endsWith('.sql') && !f.startsWith('.') && !f.startsWith('0000_')) {
    rmSync(join(migrationsDir, f), { force: true })
  }
}
if (existsSync(snapshotPath)) {
  rmSync(snapshotPath, { force: true })
}
console.log('🗑  Старые миграции и снапшот удалены')

// 3) Перегенерация из реестра
run('npm run gen:d1')

// 4) Применение к локальной базе
run('npx wrangler d1 migrations apply rdd --local')

console.log('✅ Локальная БД пересоздана и миграции применены')
