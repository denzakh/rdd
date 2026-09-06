/**
 * Полный сброс локальной D1-базы.
 * Запуск: npm run db:restart
 *
 * 1. Удаляет локальное состояние D1 (каталог .wrangler/state/v3/d1);
 * 2. Удаляет СГЕНЕРИРОВАННЫЕ миграции (baseline и дельты gen:d1) и снапшот.
 *    РУЧНЫЕ миграции (MANUAL_MIGRATIONS: аудит, auth) сохраняются, но временно
 *    выносятся из migrations/ — чтобы baseline от gen:d1 получил номер 0001
 *    и применился ПЕРЕД ручными (важно: они ссылаются на таблицы реестра);
 * 3. Запускает генератор миграций;
 * 4. Возвращает ручные миграции и применяет всё к локальной базе.
 *
 * Удалённые (remote) ресурсы не затрагиваются.
 *
 * ⚠️ Локальная база после ресета пуста: пользователи (users) стираются —
 * создайте первого заново: npm run user:create
 * При добавлении новой ручной миграции внесите её в MANUAL_MIGRATIONS.
 */
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(here, '..')
const migrationsDir = join(projectRoot, 'migrations')
const snapshotPath = join(migrationsDir, '.schema-snapshot.json')
const d1StateDir = join(projectRoot, '.wrangler', 'state', 'v3', 'd1')
const manualDir = join(projectRoot, '.wrangler', 'tmp-manual-migrations')

/**
 * Ручные миграции (не генерируются gen:d1, переживают db:restart):
 *  - 0002_audit.sql — audit_log (docs/matrix.md §6.6);
 *  - 0003_auth.sql  — users/sessions (аутентификация).
 */
const MANUAL_MIGRATIONS = ['0002_audit.sql', '0003_auth.sql']

const run = (cmd: string): void => {
  console.log(`> ${cmd}`)
  execSync(cmd, { stdio: 'inherit', cwd: projectRoot })
}

// 1) Сбрасываем локальное состояние D1
if (existsSync(d1StateDir)) {
  rmSync(d1StateDir, { recursive: true, force: true })
  console.log(`🗑  Удалено локальное состояние БД: ${d1StateDir}`)
} else {
  console.log('ℹ️  Локального состояния БД не было: ' + d1StateDir)
}

// 2) Ручные миграции временно выносим ПЕРВЫМИ (иначе цикл удаления их сотрёт),
//    затем удаляем сгенерированные миграции и снапшот
mkdirSync(manualDir, { recursive: true })
for (const f of MANUAL_MIGRATIONS) {
  const src = join(migrationsDir, f)
  if (existsSync(src)) renameSync(src, join(manualDir, f))
}
console.log(`🔒 Ручные миграции временно вынесены: ${MANUAL_MIGRATIONS.join(', ')}`)

const removed: string[] = []
for (const f of readdirSync(migrationsDir)) {
  if (!f.endsWith('.sql') || f.startsWith('.')) continue
  rmSync(join(migrationsDir, f), { force: true })
  removed.push(f)
}
if (existsSync(snapshotPath)) rmSync(snapshotPath, { force: true })
console.log(`🗑  Удалены сгенерированные миграции: ${removed.join(', ') || '(нет)'}`)

// 3) Генерация baseline из реестра (номер будет 0001)
try {
  run('npm run gen:d1')
} finally {
  // возвращаем ручные миграции даже при ошибке генерации
  for (const f of MANUAL_MIGRATIONS) {
    const src = join(manualDir, f)
    if (existsSync(src)) renameSync(src, join(migrationsDir, f))
  }
  rmSync(manualDir, { recursive: true, force: true })
  console.log('🔒 Ручные миграции возвращены в migrations/')
}

// 4) Применение к локальной базе
run('npx wrangler d1 migrations apply rdd --local')

console.log('✅ Локальная БД пересоздана и миграции применены')
console.log('⚠️  Пользователи удалены вместе с базой — создайте первого:')
console.log('   npm run user:create   (первый пользователь автоматически получит роль admin)')
