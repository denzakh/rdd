/**
 * Очистка пользователей регистра в remote D1 (прод).
 *
 * Запуск:
 *   npm run user:delete:remote -- <email>              — удалить одного
 *   npm run user:delete:remote:all                    — полная очистка: всех, включая админов
 *   npm run user:delete:remote -- --all --keep a@b.ru  — удалить всех, кроме указанных
 *   npm run user:delete:remote -- --list               — только показать пользователей
 *
 * Флаги:
 *   <email>…   позиционные аргументы: email'ы удаляемых пользователей
 *   --all      удалить всех (в т.ч. админов)
 *   --keep e   не удалять этих (список через запятую)
 *   --force    разрешить удаление, после которого НЕ останется ни одного админа
 *              (синоним --allow-no-admin); входит в user:delete:remote:all
 *   --detach   снять привязку карт пациентов (assigned_clinician_id = NULL)
 *              вместо падения по внешнему ключу
 *   --list     показать список и выйти
 *   --yes      не спрашивать подтверждение (CI/агенты)
 *   --local    работать с ЛОКАЛЬНОЙ БД (.wrangler/state) — для отладки скрипта
 *
 * Про «не останется админа»: без --force скрипт отказывается удалять последнего
 * admin — нового можно завести только скриптом create-user.ts, и потерять
 * единственную учётку с доступом к /admin/users нельзя молча. С `--force`
 * очистка проходит, и в выводе печатается команда для создания нового админа.
 *
 * Что происходит при удалении:
 *   • сессии удаляются (sessions.user_id — каскад), все входы пользователя
 *     немедленно отваливаются;
 *   • выданные им инвайты удаляются: invites.created_by — FK без каскада,
 *     иначе удаление пользователя было бы невозможно;
 *   • карты пациентов не удаляются — их можно только «отвязать» (--detach),
 *     иначе это была бы необратимая потеря клинических данных;
 *   • записи audit_log остаются как есть (append-only, DELETE запрещён триггерами).
 *
 * ⚠️ Удаление безвозвратно. Точечный дамп перед удалением:
 *   npx wrangler d1 export rdd --remote --output=backup.sql
 */
import { execSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPrompter, type Prompter } from './lib/prompt'

const here = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(here, '..')
const configPath = join(projectRoot, 'wrangler.jsonc')

// --- конфиг D1 (JSONC: точечное чтение, комментарии не мешают) ---

function readConfigField(field: string): string {
  const text = readFileSync(configPath, 'utf8')
  const m = text.match(new RegExp(`"${field}"\\s*:\\s*"([^"]+)"`))
  if (!m) throw new Error(`Не найдено поле "${field}" в ${configPath}`)
  return m[1]
}

const D1_NAME = readConfigField('database_name')
const D1_ID = readConfigField('database_id')

// --- аргументы ---

interface Args {
  remote: boolean
  yes: boolean
  all: boolean
  list: boolean
  detach: boolean
  /** Снять защиту «не должно остаться ни одного админа» (полная очистка). */
  force: boolean
  keep: string[]
  emails: string[]
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function parseArgs(): Args {
  const argv = process.argv.slice(2)
  const has = (name: string): boolean => argv.includes(name)
  // --keep принимает и "--keep a@b.ru,c@d.ru", и "--keep=a@b.ru,c@d.ru"
  const keepValue = (() => {
    const inline = argv.find((a) => a.startsWith('--keep='))
    if (inline) return inline.slice('--keep='.length)
    const i = argv.indexOf('--keep')
    return i >= 0 ? argv[i + 1] : undefined
  })()
  const consumed = new Set(['--keep', ...(keepValue ? [keepValue] : [])])
  const emails = argv.filter((a) => !a.startsWith('--') && !consumed.has(a))
  return {
    remote: !has('--local'),
    yes: has('--yes'),
    all: has('--all'),
    list: has('--list'),
    detach: has('--detach'),
    force: has('--force') || has('--allow-no-admin'),
    keep: (keepValue ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
    emails: emails.map((e) => e.toLowerCase()),
  }
}

const targetFlag = (remote: boolean): string => (remote ? '--remote' : '--local')
const targetLabel = (remote: boolean): string =>
  remote ? `ПРОД (remote D1, ${D1_ID})` : 'ЛОКАЛЬНАЯ БД (.wrangler/state)'

const sqlQuote = (value: string): string => value.replace(/'/g, "''")
const idList = (ids: Set<string>): string => [...ids].map((id) => `'${sqlQuote(id)}'`).join(', ')

/** Разбор `wrangler d1 execute --json`: строки результата SELECT. */
function parseWranglerJson(stdout: string): Record<string, unknown>[] {
  const start = stdout.search(/[[{]/)
  if (start < 0) throw new Error('Не удалось разобрать вывод wrangler (--json)')
  const end = Math.max(stdout.lastIndexOf(']'), stdout.lastIndexOf('}'))
  const parsed: unknown = JSON.parse(stdout.slice(start, end + 1))
  const items: unknown[] = Array.isArray(parsed) ? parsed : [parsed]
  const rows: Record<string, unknown>[] = []
  for (const item of items) {
    if (item && typeof item === 'object' && 'results' in item) {
      rows.push(...((item as { results?: Record<string, unknown>[] }).results ?? []))
    }
  }
  return rows
}

/** SELECT через --command. ⚠️ SQL однострочный: `--command` идёт аргументом
 *  командной строки Windows, и перевод строки внутри кавычек ломает разбор. */
function query(sql: string, remote: boolean): Record<string, unknown>[] {
  if (sql.includes('\n')) throw new Error('SQL должен быть однострочным')
  const out = execSync(
    `npx wrangler d1 execute ${D1_NAME} ${targetFlag(remote)} --json --command "${sql}"`,
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], cwd: projectRoot }
  )
  return parseWranglerJson(out)
}

/** Мутации одним файлом (--command не берёт многострочный SQL). */
function executeFile(sql: string, remote: boolean): void {
  const dir = mkdtempSync(join(tmpdir(), 'rdd-user-del-'))
  const file = join(dir, 'delete.sql')
  try {
    writeFileSync(file, sql, 'utf8')
    execSync(`npx wrangler d1 execute ${D1_NAME} ${targetFlag(remote)} --yes --file="${file}"`, {
      stdio: 'inherit',
      cwd: projectRoot,
    })
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

interface UserRow extends Record<string, unknown> {
  id: string
  email: string
  role: string
  created_at: string
  sessions: number
  patients: number
  invites: number
}

function listUsers(remote: boolean): UserRow[] {
  return query(
    `SELECT u.id, u.email, u.role, u.created_at, ` +
      `(SELECT COUNT(*) FROM sessions s WHERE s.user_id = u.id) AS sessions, ` +
      `(SELECT COUNT(*) FROM patients p WHERE p.assigned_clinician_id = u.id) AS patients, ` +
      `(SELECT COUNT(*) FROM invites i WHERE i.created_by = u.id) AS invites ` +
      `FROM users u ORDER BY u.created_at;`,
    remote
  ) as unknown as UserRow[]
}

function printUsers(rows: UserRow[]): void {
  if (!rows.length) {
    console.log('ℹ️  В базе нет пользователей.')
    return
  }
  console.log('Пользователи (сессии / карты / инвайты):')
  for (const u of rows) {
    console.log(
      `  ${u.email.padEnd(30)} ${u.role.padEnd(10)} создан ${u.created_at}  ` +
        `сессий=${u.sessions ?? 0} карт=${u.patients ?? 0} инвайтов=${u.invites ?? 0}`
    )
  }
}

/** Команда создания первого admin после полной очистки (первый в базе = admin). */
const createAdminHint = (remote: boolean): string =>
  remote ? 'npm run user:create:remote' : 'npm run user:create'

const NON_INTERACTIVE_HINT =
  'Неинтерактивный режим: укажите email позиционным аргументом, например:\n' +
  '  npm run user:delete:remote -- user@example.com\n' +
  '  npm run user:delete:remote -- --all --keep admin@example.com --yes'

async function main(): Promise<void> {
  const args = parseArgs()
  const label = targetLabel(args.remote)
  console.log(`Очистка пользователей. Цель: ${label}\n`)

  const badEmail = args.emails.find((e) => !EMAIL_RE.test(e))
  if (badEmail) throw new Error(`Некорректный email: ${badEmail}`)

  const prompt = createPrompter()
  try {
    const all = listUsers(args.remote)
    printUsers(all)
    if (args.list) return

    const byEmail = new Map(all.map((u) => [u.email.toLowerCase(), u]))
    const targets: UserRow[] = []
    if (args.all) {
      const keep = new Set(args.keep)
      const unknown = [...keep].filter((e) => !byEmail.has(e))
      if (unknown.length)
        console.log(
          `ℹ️  В --keep неизвестные email (остаются в любом случае): ${unknown.join(', ')}`
        )
      for (const u of all) if (!keep.has(u.email.toLowerCase())) targets.push(u)
    } else {
      if (!args.emails.length)
        throw new Error(`Не указан ни email, ни --all.\n${NON_INTERACTIVE_HINT}`)
      const missing = args.emails.filter((e) => !byEmail.has(e))
      if (missing.length) throw new Error(`Не найдены в базе: ${missing.join(', ')}`)
      for (const e of args.emails) targets.push(byEmail.get(e)!)
    }

    if (!targets.length) {
      console.log('ℹ️  Нечего удалять.')
      return
    }

    const ids = new Set(targets.map((t) => t.id))
    const idsSql = idList(ids)

    // Страховка: нового админа можно создать только скриптом create-user.ts.
    const adminsLeft = Number(
      query(`SELECT COUNT(*) AS n FROM users WHERE role = 'admin';`, args.remote)[0]?.n ?? 0
    )
    const adminsRemoved = Number(
      query(
        `SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND id IN (${idsSql});`,
        args.remote
      )[0]?.n ?? 0
    )
    const noAdminsLeft = adminsLeft - adminsRemoved === 0
    if (noAdminsLeft) {
      if (!args.force) {
        throw new Error(
          'После удаления не останется ни одного админа — управление пользователями станет недоступно.\n' +
            '  • исключите админа из выборки:  --all --keep ' +
            (all[0]?.email ?? 'admin@example.com') +
            '\n' +
            '  • или полная очистка (после неё вход закрыт для всех):  --all --force'
        )
      }
      console.log(
        '⚠️  --force: после удаления НЕ останется ни одного админа. ' +
          'Вход в приложение будет закрыт для всех, пока не создать нового админа:\n' +
          `      ${createAdminHint(args.remote)}`
      )
    }

    const patients = Number(
      query(
        `SELECT COUNT(*) AS n FROM patients WHERE assigned_clinician_id IN (${idsSql});`,
        args.remote
      )[0]?.n ?? 0
    )
    if (patients > 0) {
      if (!args.detach) {
        throw new Error(
          `У удаляемых пользователей ${patients} карт пациентов. Повторите с --detach: ` +
            'привязка врача будет снята (assigned_clinician_id = NULL), сами карты останутся.'
        )
      }
      console.log(`ℹ️  Будет отвязано карт пациентов: ${patients} (--detach)`)
    }

    console.log(`\nК удалению (${targets.length}):`)
    for (const t of targets) console.log(`  ${t.email} (${t.role})`)

    if (args.remote && !args.yes) {
      if (!prompt.interactive) throw new Error(NON_INTERACTIVE_HINT)
      const answer = await prompt.ask(`Удалить в ${label}? Напечатайте "prod" для подтверждения`)
      if (answer !== 'prod') {
        console.log('Отменено.')
        return
      }
    }

    // Порядок важен: invites.created_by — FK без каскада, sessions — с каскадом,
    // но сессии удаляем явно, чтобы не зависеть от настроек внешних ключей.
    const statements = [
      `DELETE FROM invites WHERE created_by IN (${idsSql});`,
      `DELETE FROM sessions WHERE user_id IN (${idsSql});`,
    ]
    if (args.detach) {
      statements.push(
        `UPDATE patients SET assigned_clinician_id = NULL WHERE assigned_clinician_id IN (${idsSql});`
      )
    }
    statements.push(`DELETE FROM users WHERE id IN (${idsSql});`)
    executeFile(statements.join('\n'), args.remote)

    const left = Number(
      query(`SELECT COUNT(*) AS n FROM users WHERE id IN (${idsSql});`, args.remote)[0]?.n ?? 0
    )
    if (left !== 0) throw new Error('Проверка после удаления не прошла')

    console.log(
      `\n✅ Удалено пользователей: ${targets.length} (сессии отозваны, их инвайты аннулированы)`
    )
    console.log('Остались:')
    printUsers(listUsers(args.remote))
    if (noAdminsLeft) {
      console.log(
        '\n⚠️  Админов не осталось — вход закрыт. Создайте первого заново:\n' +
          `   ${createAdminHint(args.remote)}\n` +
          '   (первый пользователь в пустой базе автоматически получает роль admin)'
      )
    }
  } finally {
    prompt.close()
  }
}

main().catch((e) => {
  console.error(`❌ ${e instanceof Error ? e.message : e}`)
  process.exit(1)
})
