/**
 * Одноразовый вход без пароля: выпускает сессию напрямую в remote D1.
 * Нужен, когда пароль в БД корректен (проверено verifyPassword), но вход
 * не проходит — чтобы отделить проблему ввода/автозаполнения от проблемы сервера.
 *
 * В БД кладётся SHA-256(токен), сам токен печатается один раз: его нужно
 * положить в cookie `rdd_session` (httpOnly, secure, path=/, max-age 43200).
 * Так пароль не используется вообще — обход только для админа, который
 * уже доказал право входа (знает пароль от своей учётной записи).
 *
 * Запуск:
 *   npx tsx scripts/mint-session-remote.ts <email>
 */
import { execSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { createHash } from '../src/shared/lib/hash'

const D1_NAME = 'rdd'
const SESSION_TTL_HOURS = 12
const SESSION_COOKIE = 'rdd_session'

function parseWranglerJson(stdout: string): Record<string, unknown>[] {
  const start = stdout.search(/[[{]/)
  if (start < 0) throw new Error('Не удалось разобрать вывод wrangler (ожидался JSON)')
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

function query(sql: string): Record<string, unknown>[] {
  const out = execSync(`npx wrangler d1 execute ${D1_NAME} --remote --json --command "${sql}"`, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  })
  return parseWranglerJson(out)
}

const sqlQuote = (value: string): string => value.replace(/'/g, "''")

async function main(): Promise<void> {
  const email = (process.argv[2] ?? '').toLowerCase()
  if (!email)
    throw new Error('Укажите email: npx tsx scripts/mint-session-remote.ts user@example.com')

  const users = query(`SELECT id, role FROM users WHERE email = '${sqlQuote(email)}';`)
  if (!users.length) throw new Error(`Пользователь ${email} не найден`)
  const userId = String(users[0]!.id)

  // Токен: base64url из 32 случайных байт — тот же формат, что generateSessionToken.
  const token = randomBytes(32).toString('base64url')
  const tokenHash = await createHash('sha-256', token)
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 3_600_000).toISOString()

  // SQL однострочный: `--command` — аргумент командной строки Windows.
  const sql =
    `INSERT INTO sessions (id, user_id, expires_at, user_agent) VALUES (` +
    `'${sqlQuote(tokenHash)}', '${sqlQuote(userId)}', '${sqlQuote(expiresAt)}', 'mint-session-remote');`
  if (sql.includes('\n')) throw new Error('SQL должен быть однострочным')
  query(sql)

  // Контроль: сессия должна находиться по хешу токена.
  const check = query(
    `SELECT s.id, s.expires_at, u.email, u.role FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = '${sqlQuote(tokenHash)}';`
  )
  if (!check.length) throw new Error('Сессия не записалась — проверка не пройдена')

  console.log('✅ Сессия выпущена:', check[0])
  console.log(`\nCookie: ${SESSION_COOKIE}=${token}`)
  console.log(`Срок: ${expiresAt} (${SESSION_TTL_HOURS} ч)\n`)
  console.log('Как зайти без пароля — выполните в консоли браузера на странице приложения:')
  console.log(
    `document.cookie = "${SESSION_COOKIE}=${token}; path=/; domain=rdd.ux42.studio; secure; samesite=lax; max-age=${SESSION_TTL_HOURS * 3600}"`
  )
  console.log('location.reload()')
  console.log(
    '\nCookie httpOnly-природу обойти из консоли нельзя, но здесь она не нужна:' +
      '\nсервер только читает значение. После входа смените пароль в профиле.'
  )
}

main().catch((e: unknown) => {
  console.error(`❌ ${e instanceof Error ? e.message : e}`)
  process.exit(1)
})
