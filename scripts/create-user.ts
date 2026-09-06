/**
 * Создание пользователя регистра (интерактивно или через флаги).
 *
 * Запуск:
 *   npm run user:create           — локальная БД (getPlatformProxy, .wrangler/state)
 *   npm run user:create:remote    — прод-БД (wrangler d1 execute rdd --remote)
 *
 * Неинтерактивный режим (для CI/автоматизации):
 *   tsx scripts/create-user.ts --email a@b.ru --name "Имя" --role admin --password "..."
 *   tsx scripts/create-user.ts --email a@b.ru --gen-password   (пароль напечатается один раз)
 *
 * Первый пользователь в базе всегда получает роль admin.
 * Публичной регистрации нет — пользователи заводятся только этим скриптом.
 */
import { execSync } from 'node:child_process'
import { randomBytes, randomUUID } from 'node:crypto'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { Writable } from 'node:stream'
import { getPlatformProxy } from 'wrangler'
import { hashPassword } from '../src/shared/lib/password'

const ROLES = ['admin', 'clinician', 'readonly'] as const
type Role = (typeof ROLES)[number]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 10
const D1_NAME = 'rdd'

// ---------- ввод ----------

const makeRl = () => createInterface({ input: process.stdin, output: process.stdout })

/** Ввод со скрытием символов (для пароля) — readline по умолчанию всё эхо-печатает. */
async function askHidden(question: string): Promise<string> {
  const muted = new Writable({
    write(chunk, _enc, cb) {
      // глотаем вводимые символы, но на Enter переводим строку
      if (String(chunk).includes('\r') || String(chunk).includes('\n')) process.stdout.write('\n')
      cb()
    },
  })
  const rl = createInterface({ input: process.stdin, output: muted, terminal: true })
  process.stdout.write(question)
  const answer = await rl.question('')
  rl.close()
  return answer.trim()
}

async function ask(rl: ReturnType<typeof makeRl>, question: string, def = ''): Promise<string> {
  const suffix = def ? ` (${def})` : ''
  const answer = (await rl.question(`${question}${suffix}: `)).trim()
  return answer || def
}

// ---------- аргументы ----------

interface Args {
  remote: boolean
  email?: string
  name?: string
  role?: string
  password?: string
  genPassword: boolean
  interactive: boolean
}

function parseArgs(): Args {
  const argv = process.argv.slice(2)
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag)
    return i >= 0 ? argv[i + 1] : undefined
  }
  const flags = new Set(argv.filter((a) => a.startsWith('--')))
  const email = get('--email')
  const password = get('--password')
  return {
    remote: flags.has('--remote'),
    email,
    name: get('--name'),
    role: get('--role'),
    password,
    genPassword: flags.has('--gen-password'),
    // интерактив = не переданы обязательные сущности
    interactive: !email || (!password && !flags.has('--gen-password')),
  }
}

const generatePassword = (): string => randomBytes(12).toString('base64url') // 16 символов

// ---------- SQL для remote ----------

interface NewUser {
  id: string
  email: string
  passwordHash: string
  displayName: string
  role: string
}

const sqlQuote = (value: string): string => value.replace(/'/g, "''")

const buildInsertSql = (u: NewUser): string =>
  `INSERT INTO users (id, email, password_hash, display_name, role, must_change_password)\n` +
  `VALUES ('${sqlQuote(u.id)}', '${sqlQuote(u.email.toLowerCase())}', '${sqlQuote(u.passwordHash)}', '${sqlQuote(u.displayName)}', '${sqlQuote(u.role)}', 0);\n`

const buildVerifySql = (id: string): string =>
  `SELECT email, role, created_at FROM users WHERE id = '${sqlQuote(id)}';`

// wrangler d1 execute --json печатает JSON в stdout; парсим с запасом на мусор
function parseWranglerJson(stdout: string): Record<string, unknown>[] {
  const start = stdout.indexOf('{')
  if (start < 0) throw new Error('Не удалось разобрать вывод wrangler (--json)')
  const parsed = JSON.parse(stdout.slice(start)) as { results?: Record<string, unknown>[] }
  return parsed.results ?? []
}

function countUsersRemote(): number {
  const out = execSync(
    `npx wrangler d1 execute ${D1_NAME} --remote --json --command "SELECT COUNT(*) AS c FROM users"`,
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }
  )
  const rows = parseWranglerJson(out)
  return Number(rows[0]?.c ?? 0)
}

// ---------- локальная БД (getPlatformProxy) ----------

/** Проверяет наличие таблицы users и подсказывает применить миграции. */
async function withUsersTable<T>(db: D1Database, fn: (db: D1Database) => Promise<T>): Promise<T> {
  try {
    await db.prepare('SELECT 1 FROM users LIMIT 1').run()
  } catch {
    console.error(`Таблицы users нет. Сначала примените миграции:
  локально: npm run db:migrate:local
  прод:     npm run db:migrate:remote`)
    process.exit(1)
  }
  return fn(db)
}

async function countUsersLocal(): Promise<number> {
  const { env, dispose } = await getPlatformProxy<CloudflareEnv>({ configPath: 'wrangler.jsonc' })
  try {
    return await withUsersTable(env.DB, async (db) => {
      const row = await db.prepare('SELECT COUNT(*) AS c FROM users').first<{ c: number }>()
      return Number(row?.c ?? 0)
    })
  } finally {
    await dispose()
  }
}

async function createUserLocal(user: NewUser): Promise<void> {
  const { env, dispose } = await getPlatformProxy<CloudflareEnv>({ configPath: 'wrangler.jsonc' })
  try {
    await withUsersTable(env.DB, async (db) => {
      await db
        .prepare(
          'INSERT INTO users (id, email, password_hash, display_name, role, must_change_password) VALUES (?, ?, ?, ?, ?, ?)'
        )
        .bind(user.id, user.email, user.passwordHash, user.displayName, user.role, 0)
        .run()
      const row = await db
        .prepare('SELECT email, role FROM users WHERE id = ?')
        .bind(user.id)
        .first<{ email: string; role: string }>()
      if (!row || row.email !== user.email) throw new Error('Проверка после вставки не прошла')
    })
  } finally {
    await dispose()
  }
}

// ---------- prod (wrangler d1 execute --remote) ----------

function createUserRemote(user: NewUser): void {
  const dir = mkdtempSync(join(tmpdir(), 'rdd-user-'))
  const file = join(dir, 'insert.sql')
  try {
    writeFileSync(file, buildInsertSql(user), 'utf8')
    console.log(`> wrangler d1 execute ${D1_NAME} --remote --file=${file}`)
    execSync(`npx wrangler d1 execute ${D1_NAME} --remote --yes --file=${file}`, {
      stdio: 'inherit',
    })
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }

  // верификация: читаем запись обратно
  const verifyDir = mkdtempSync(join(tmpdir(), 'rdd-user-'))
  const verifyFile = join(verifyDir, 'verify.sql')
  try {
    writeFileSync(verifyFile, buildVerifySql(user.id), 'utf8')
    const out = execSync(
      `npx wrangler d1 execute ${D1_NAME} --remote --json --file=${verifyFile}`,
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'inherit'],
      }
    )
    const rows = parseWranglerJson(out)
    const row = rows[0] as { email?: string } | undefined
    if (!row || row.email !== user.email)
      throw new Error('Проверка после вставки в remote не прошла')
  } finally {
    rmSync(verifyDir, { recursive: true, force: true })
  }
}

// ---------- main ----------

async function main(): Promise<void> {
  const args = parseArgs()
  const target = args.remote ? 'ПРОД (remote D1)' : 'локальная база (D1 rdd, .wrangler/state)'
  console.log(`Создание пользователя. Цель: ${target}\n`)

  const rl = makeRl()
  try {
    let email = args.email ?? ''
    if (!email) email = await ask(rl, 'Email')
    email = email.toLowerCase()
    if (!EMAIL_RE.test(email)) throw new Error(`Некорректный email: ${email}`)

    let displayName = args.name ?? ''
    if (!displayName) displayName = await ask(rl, 'Имя (display name)', email.split('@')[0] ?? '')
    if (!displayName) throw new Error('Имя не может быть пустым')

    // пароль
    let password = args.password ?? ''
    let generated = false
    if (args.genPassword) {
      password = generatePassword()
      generated = true
    } else if (!password) {
      password = await askHidden('Пароль (ввод скрыт): ')
      if (password.length < MIN_PASSWORD_LENGTH) {
        throw new Error(`Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов`)
      }
      const repeat = await askHidden('Повторите пароль: ')
      if (repeat !== password) throw new Error('Пароли не совпадают')
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(`Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов`)
    }

    // подсчёт пользователей → роль (первый всегда admin)
    const userCount = args.remote ? countUsersRemote() : await countUsersLocal()
    const isFirstUser = userCount === 0

    let role: Role
    if (isFirstUser) {
      role = 'admin'
      console.log('ℹ️  В базе ещё нет пользователей — роль назначена: admin')
    } else if (args.role) {
      if (!ROLES.includes(args.role as Role)) {
        throw new Error(`Неизвестная роль: ${args.role}. Допустимо: ${ROLES.join(', ')}`)
      }
      role = args.role as Role
    } else if (args.interactive) {
      const input = await ask(rl, `Роль [${ROLES.join('/')}]`, 'clinician')
      if (!ROLES.includes(input as Role)) {
        throw new Error(`Неизвестная роль: ${input}. Допустимо: ${ROLES.join(', ')}`)
      }
      role = input as Role
    } else {
      role = 'clinician'
    }

    if (args.remote) {
      const answer = await ask(
        rl,
        `Записать в ${D1_NAME} (remote)? Напечатайте "prod" для подтверждения`
      )
      if (answer !== 'prod') {
        console.log('Отменено.')
        return
      }
    }

    const passwordHash = await hashPassword(password)
    const user: NewUser = { id: randomUUID(), email, passwordHash, displayName, role }

    if (args.remote) {
      createUserRemote(user)
    } else {
      await createUserLocal(user)
    }

    console.log('\n✅ Пользователь создан:')
    console.log(`   email: ${email}`)
    console.log(`   имя:   ${displayName}`)
    console.log(`   роль:  ${role}`)
    console.log(`   id:    ${user.id}`)
    if (generated) {
      console.log(`\n🔑 Сгенерированный пароль (покажется один раз, передайте врачу): ${password}`)
    }
  } finally {
    rl.close()
  }
}

main().catch((e) => {
  console.error(`❌ ${e instanceof Error ? e.message : e}`)
  process.exit(1)
})
