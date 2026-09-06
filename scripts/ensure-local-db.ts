/**
 * Приводит локальную D1-базу к актуальной схеме, но применяет миграции
 * только когда это действительно нужно (есть неприменённые файлы).
 * Запуск: npm run test:db (вызывается автоматически перед тестами)
 *
 * Логика:
 *  1. Читает файлы миграций из migrations/ (*.sql, не служебные).
 *  2. Поднимает локальную базу через getPlatformProxy (при отсутствии создаёт
 *     пустую) и читает таблицу d1_migrations — что уже применено.
 *  3. Если есть неприменённые файлы (или таблицы миграций ещё нет) —
 *     запускает `wrangler d1 migrations apply rdd --local`.
 *  4. Иначе — сообщает, что схема актуальна, и ничего не накатывает.
 */
import { execSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getPlatformProxy } from 'wrangler'

const here = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(here, '..')
const migrationsDir = join(projectRoot, 'migrations')

const run = (cmd: string): void => {
  console.log(`> ${cmd}`)
  execSync(cmd, { stdio: 'inherit', cwd: projectRoot })
}

async function main(): Promise<void> {
  const files = existsSync(migrationsDir)
    ? readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql') && !f.startsWith('.'))
        .sort()
    : []

  if (files.length === 0) {
    console.log('ℹ️  Миграций для применения нет — пропускаю проверку')
    return
  }

  // Узнаём, какие миграции уже применены в локальной базе.
  const applied = new Set<string>()
  const { env, dispose } = await getPlatformProxy<CloudflareEnv>({ configPath: 'wrangler.jsonc' })
  try {
    const res = await env.DB.prepare('SELECT name FROM d1_migrations').all<{ name: string }>()
    res.results.forEach((r) => applied.add(r.name))
  } catch {
    // Таблицы d1_migrations нет — база ещё не инициализирована миграциями.
  } finally {
    await dispose()
  }

  const missing = files.filter((f) => !applied.has(f))
  if (missing.length === 0) {
    console.log('ℹ️  Локальная схема актуальна — миграции не требуются')
    return
  }

  console.log(`🔧 Не применены: ${missing.join(', ')} — запускаю миграции`)
  run('npx wrangler d1 migrations apply rdd --local')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
