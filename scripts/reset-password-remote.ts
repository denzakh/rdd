/**
 * Одноразовый сброс пароля существующего пользователя в remote D1.
 * Пароль передаётся через переменную окружения RDD_NEW_PASSWORD, чтобы он
 * не попал в историю командной строки и в вывод.
 *
 * Запуск (Git Bash):
 *   RDD_NEW_PASSWORD='<пароль>' npx tsx scripts/reset-password-remote.ts <email>
 *
 * Делает то же, что делает приложение при смене пароля (user-repo.ts:196):
 * новый хеш, сброс счётчика неудачных попыток и снятие блокировки.
 */
import { execSync } from 'node:child_process'
import { hashPassword, verifyPassword } from '../src/shared/lib/password'

const D1_NAME = 'rdd'

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
  const password = process.env.RDD_NEW_PASSWORD ?? ''
  if (!email)
    throw new Error('Укажите email: npx tsx scripts/reset-password-remote.ts user@example.com')
  if (password.length < 10) throw new Error('Пароль должен быть не короче 10 символов')

  const existing = query(`SELECT id FROM users WHERE email = '${sqlQuote(email)}';`)
  if (!existing.length) throw new Error(`Пользователь ${email} не найден`)

  const hash = await hashPassword(password)
  // Пароль в SQL не попадает — только хеш (он и так не содержит обратимых данных).
  // ⚠️ SQL обязан быть ОДНОСТРОЧНЫМ: `--command` передаётся как аргумент командной
  // строки Windows, а перевод строки внутри кавычек там ломает разбор.
  const update =
    `UPDATE users SET password_hash = '${sqlQuote(hash)}', must_change_password = 0, ` +
    `failed_attempts = 0, locked_until = NULL, ` +
    `updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE email = '${sqlQuote(email)}';`
  if (update.includes('\n')) throw new Error('SQL должен быть однострочным')
  query(update)

  // Контрольная проверка: новый пароль должен подходить к записанному хешу.
  const check = query(`SELECT password_hash FROM users WHERE email = '${sqlQuote(email)}';`)
  const stored = String(check[0]?.password_hash ?? '')
  if (!(await verifyPassword(password, stored))) throw new Error('Проверка после записи не прошла')

  const state = query(
    `SELECT email, role, must_change_password, failed_attempts, locked_until FROM users WHERE email = '${sqlQuote(email)}';`
  )
  console.log('✅ Пароль обновлён:', state[0])
}

main().catch((e: unknown) => {
  console.error(`❌ ${e instanceof Error ? e.message : e}`)
  process.exit(1)
})
