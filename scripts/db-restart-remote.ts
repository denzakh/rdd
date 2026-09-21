/**
 * Полный сброс ПРОД-БД (remote D1) с повторным применением миграций.
 *
 * Запуск:
 *   npm run db:restart:remote            — дамп → DROP всех таблиц → migrations apply --remote
 *   npm run db:restart:remote:seed       — то же + демо-данные (scripts/seed-demo.ts --remote)
 *   tsx scripts/db-restart-remote.ts --yes
 *
 * Флаги:
 *   --yes        не спрашивать «prod» (для автоматизации; пробрасывается в сеялку)
 *   --seed       после сброса залить демо-данные (npm run seed:demo:remote)
 *   --no-backup  не делать дамп перед удалением
 *   --local      работать с ЛОКАЛЬНОЙ БД (.wrangler/state) — только для отладки скрипта
 *
 * ⚠️ Данные прода удаляются безвозвратно; страховка — дамп в `.wrangler/backups/`
 * (каталог в .gitignore: дамп содержит персональные данные, в git он попасть не должен).
 * ⚠️ Пользователи и сессии удаляются вместе с базой — после сброса первый админ
 * создаётся заново: npm run user:create:remote
 *
 * Почему DROP идёт в вычисленном порядке: D1 применяет внешние ключи всегда
 * (эквивалент `PRAGMA foreign_keys = on`, см. docs.cloudflare.com/d1 → Define foreign keys),
 * поэтому дочерние таблицы удаляются раньше родительских. Порядок строится из DDL в
 * `sqlite_master` (по `REFERENCES …`), а не хардкодится — новые таблицы из реестра
 * подхватываются автоматически.
 */
import { execSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline/promises'

const here = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(here, '..')
const configPath = join(projectRoot, 'wrangler.jsonc')
const migrationsDir = join(projectRoot, 'migrations')
const backupDir = join(projectRoot, '.wrangler', 'backups')
/** Таблицы, по которым печатается отчёт «до/после» (если существуют). */
const REPORT_TABLES = ['patients', 'phases', 'users', 'audit_log'] as const

const argv = process.argv.slice(2)
const assumeYes = argv.includes('--yes')
const wantSeed = argv.includes('--seed')
const noBackup = argv.includes('--no-backup')
const useLocal = argv.includes('--local')

// --- конфиг D1 (JSONC: точечное чтение нужных полей, комментарии не мешают) ---

function readConfigField(field: string): string {
  const text = readFileSync(configPath, 'utf8')
  const m = text.match(new RegExp(`"${field}"\\s*:\\s*"([^"]+)"`))
  if (!m) throw new Error(`Не найдено поле "${field}" в ${configPath}`)
  return m[1]
}

const D1_NAME = readConfigField('database_name')
const D1_ID = readConfigField('database_id')
const targetFlag = useLocal ? '--local' : '--remote'
const targetLabel = useLocal ? 'ЛОКАЛЬНАЯ БД (.wrangler/state)' : `ПРОД (remote D1, ${D1_ID})`

// --- запуск и чтение D1 ---

function run(cmd: string): void {
  console.log(`> ${cmd}`)
  execSync(cmd, { stdio: 'inherit', cwd: projectRoot })
}

/** Разбор `wrangler d1 execute --json`: массив результатов по каждому statement. */
function parseWranglerJson(stdout: string): Record<string, unknown>[] {
  const start = stdout.search(/[[{]/)
  if (start < 0) throw new Error('Не удалось разобрать вывод wrangler (ожидался JSON)')
  const end = Math.max(stdout.lastIndexOf(']'), stdout.lastIndexOf('}'))
  const parsed: unknown = JSON.parse(stdout.slice(start, end + 1))
  const items: unknown[] = Array.isArray(parsed) ? parsed : [parsed]
  const rows: Record<string, unknown>[] = []
  for (const item of items) {
    if (Array.isArray(item)) rows.push(...(item as Record<string, unknown>[]))
    else if (item && typeof item === 'object' && 'results' in item) {
      rows.push(...((item as { results?: Record<string, unknown>[] }).results ?? []))
    } else if (item && typeof item === 'object') rows.push(item as Record<string, unknown>)
  }
  return rows
}

/** Выполнить SELECT через wrangler и получить строки (SQL пишется во временный файл). */
function queryRows(sql: string): Record<string, unknown>[] {
  const dir = mkdtempSync(join(tmpdir(), 'rdd-reset-'))
  try {
    const file = join(dir, 'query.sql')
    writeFileSync(file, sql, 'utf8')
    const out = execSync(
      `npx wrangler d1 execute ${D1_NAME} ${targetFlag} --json --file="${file}"`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], cwd: projectRoot }
    )
    return parseWranglerJson(out)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

interface TableInfo {
  name: string
  sql: string
}

/**
 * Служебные таблицы движка (SQLite/Cloudflare) — их удалять нельзя:
 * `DROP TABLE "_cf_METADATA"` возвращает `not authorized: SQLITE_AUTH`.
 * `d1_migrations` сюда НЕ входит: её удаляют, чтобы миграции применились заново.
 */
const INTERNAL_TABLE_RE = /^(sqlite_|_cf_)/i

/** Таблицы схемы регистра (без служебных). */
function listTables(): TableInfo[] {
  const rows = queryRows("SELECT name, sql FROM sqlite_master WHERE type = 'table';")
  return rows
    .filter((r) => !INTERNAL_TABLE_RE.test(String(r.name)))
    .map((r) => ({ name: String(r.name), sql: String(r.sql ?? '') }))
}

/**
 * Порядок удаления таблиц: сначала те, от которых никто не зависит (дети), затем родители.
 * Рёбра строятся по `REFERENCES <table>(…)` из DDL таблицы.
 */
function dropOrder(tables: TableInfo[]): string[] {
  const names = new Set(tables.map((t) => t.name))
  const dependents = new Map<string, Set<string>>()
  for (const name of names) dependents.set(name, new Set())

  for (const table of tables) {
    const re = /references\s+"?([A-Za-z_][A-Za-z0-9_]*)"?\s*\(/gi
    let match: RegExpExecArray | null
    while ((match = re.exec(table.sql)) !== null) {
      const parent = match[1]
      if (parent !== table.name && names.has(parent)) dependents.get(parent)?.add(table.name)
    }
  }

  const order: string[] = []
  const pending = new Set(names)
  while (pending.size > 0) {
    const leaves = [...pending]
      .filter((name) => [...(dependents.get(name) ?? [])].every((child) => !pending.has(child)))
      .sort()
    if (leaves.length === 0) {
      // Цикл по REFERENCES (в схеме регистра не встречается) — удаляем остаток как есть.
      order.push(...[...pending].sort())
      break
    }
    order.push(...leaves)
    leaves.forEach((name) => pending.delete(name))
  }
  return order
}

// --- шаги сброса ---

/** Количество строк в таблице (null — таблицы нет или запрос не удался). */
function countRows(table: string): number | null {
  try {
    const rows = queryRows(`SELECT COUNT(*) AS c FROM "${table}";`)
    const value = rows[0]?.c
    return value === undefined || value === null ? null : Number(value)
  } catch {
    return null
  }
}

/** Отчёт «сколько данных в базе» (только по существующим таблицам). */
function printCounts(label: string, tables: TableInfo[]): void {
  const existing = new Set(tables.map((t) => t.name))
  const parts = REPORT_TABLES.filter((t) => existing.has(t)).map(
    (t) => `${t}=${countRows(t) ?? '?'}`
  )
  if (parts.length > 0) console.log(`${label} ${parts.join(', ')}`)
  console.log(`${label} всего таблиц: ${tables.length}`)
}

/** Дамп базы в `.wrangler/backups` — страховка перед удалением. */
function makeBackup(): string {
  mkdirSync(backupDir, { recursive: true })
  const stamp = new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-')
  const file = join(backupDir, `${D1_NAME}-${stamp}.sql`)
  run(`npx wrangler d1 export ${D1_NAME} ${targetFlag} --output="${file}"`)
  return file
}

/** DROP всех таблиц одним SQL-файлом в вычисленном порядке (дети → родители). */
function dropAllTables(tables: TableInfo[]): void {
  const order = dropOrder(tables)
  console.log(`🗑  Удаляю таблицы (${order.length}): ${order.join(', ')}`)
  const dir = mkdtempSync(join(tmpdir(), 'rdd-drop-'))
  try {
    const file = join(dir, 'drop.sql')
    writeFileSync(file, order.map((name) => `DROP TABLE IF EXISTS "${name}";`).join('\n'), 'utf8')
    run(`npx wrangler d1 execute ${D1_NAME} ${targetFlag} --yes --file="${file}"`)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/** Подтверждение вводом «prod» (кроме режима --yes). */
async function confirmRun(): Promise<boolean> {
  if (assumeYes) return true
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    const answer = (
      await rl.question(
        `Сбросить ${targetLabel} — базу «${D1_NAME}»? Напечатайте "prod" для подтверждения: `
      )
    ).trim()
    if (answer !== 'prod') {
      console.log('Отменено.')
      return false
    }
    return true
  } finally {
    rl.close()
  }
}

/** Проверка, что после сброса схема на месте (иначе — явная ошибка, а не «тихо пустая база»). */
function verifyReset(): void {
  const tables = new Set(listTables().map((t) => t.name))
  const expected = [
    'patients',
    'phases',
    'registry_versions',
    'users',
    'sessions',
    'invites',
    'audit_log',
  ]
  const missing = expected.filter((t) => !tables.has(t))
  if (missing.length > 0) throw new Error(`После сброса нет таблиц: ${missing.join(', ')}`)
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).length
  const applied = countRows('d1_migrations')
  console.log(
    `✅ Схема пересоздана: таблиц ${tables.size}, миграций применено ${applied} из ${files}`
  )
  if (applied !== files) {
    console.log(`⚠️  Применённых миграций (${applied}) не столько же, сколько файлов (${files}).`)
  }
}

async function main(): Promise<void> {
  console.log(`Сброс базы «${D1_NAME}». Цель: ${targetLabel}\n`)

  if (!(await confirmRun())) return

  const before = listTables()
  if (before.length === 0) {
    console.log('ℹ️  Таблиц нет — удалять нечего, сразу применяю миграции.')
  } else {
    printCounts('ℹ️  Сейчас в базе:', before)
    if (noBackup) {
      console.log('⚠️  Флаг --no-backup: дамп не делается.')
    } else {
      const file = makeBackup()
      console.log(`💾 Дамп: ${file}`)
      console.log(
        `   Восстановление: npx wrangler d1 execute ${D1_NAME} ${targetFlag} --yes --file="${file}"`
      )
    }
    dropAllTables(before)
  }

  run(`npx wrangler d1 migrations apply ${D1_NAME} ${targetFlag}`)
  verifyReset()

  if (wantSeed) {
    const localOrRemote = useLocal ? '' : ' --remote'
    const yes = assumeYes ? ' --yes' : ''
    run(`npx tsx scripts/seed-demo.ts${localOrRemote}${yes}`)
  }

  const after = listTables()
  printCounts('▶ Итог:', after)
  console.log('\n⚠️  Пользователи удалены вместе с базой — создайте первого админа:')
  console.log(useLocal ? '   npm run user:create' : '   npm run user:create:remote')
}

main().catch((e) => {
  console.error(`❌ ${e instanceof Error ? e.message : e}`)
  process.exit(1)
})
