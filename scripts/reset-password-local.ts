/**
 * Одноразовый сброс пароля существующего пользователя в локальной D1.
 *
 * Запуск (интерактивно — email и пароль спросят сами):
 *   npx tsx scripts/reset-password-local.ts
 *   npm run user:reset-password:local
 *
 * Неинтерактивно (CI/агенты, без TTY):
 *   npx tsx scripts/reset-password-local.ts user@example.com
 *   RDD_NEW_PASSWORD='<пароль>' npx tsx scripts/reset-password-local.ts user@example.com
 * Флаги --email / --password работают так же, как в create-user.ts.
 *
 * Пароль вводится со скрытием эха и подтверждается повтором. В неинтерактивном
 * режиме его нужно передать через RDD_NEW_PASSWORD, чтобы не светить в истории
 * командной строки.
 *
 * Зачем нужен: хеш может оказаться с числом итераций, которое Workers
 * не переваривает (см. предупреждение в src/shared/lib/password.ts). verifyPassword
 * берёт итерации из самого хэша, поэтому старый хэш с 600 000 ломает вход,
 * пока в коде уже 100 000. Скрипт перезаписывает хэш текущими параметрами.
 *
 * Делает то же, что приложение при смене пароля (user-repo.ts:196):
 * новый хэш, сброс счётчика неудачных попыток и снятие блокировки.
 */
import { execSync } from 'node:child_process'
import { createInterface } from 'node:readline/promises'
import { Writable } from 'node:stream'
import { hashPassword, MIN_PASSWORD_LENGTH, verifyPassword } from '../src/shared/lib/password'

const D1_NAME = 'rdd'

// ---------- ввод (паттерн scripts/create-user.ts) ----------

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

async function ask(rl: ReturnType<typeof makeRl>, question: string): Promise<string> {
  return (await rl.question(`${question}: `)).trim()
}

/** Интерактивный режим возможен только при TTY — иначе скрипт не должен висеть. */
const isInteractive = (): boolean => Boolean(process.stdin.isTTY && process.stdout.isTTY)

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

function execSql(sql: string): string {
  // Локальная D1 — один файл SQLite. Если параллельно работает dev-сервер или
  // другое wrangler-включение, прилетает SQLITE_BUSY/SQLITE_LOCKED. Это
  // состояние гонки, а не ошибка запроса, поэтому просто повторяем.
  const RETRIES = 5
  for (let attempt = 1; ; attempt++) {
    try {
      return execSync(`npx wrangler d1 execute ${D1_NAME} --local --json --command "${sql}"`, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    } catch (e) {
      const output = `${e instanceof Error ? e.message : e}${
        (e as { stderr?: string }).stderr ?? ''
      }`
      const busy = /SQLITE_(BUSY|LOCKED)/i.test(output)
      if (!busy || attempt > RETRIES) {
        if (busy) {
          throw new Error(
            `Локальная база занята другим процессом (SQLITE_BUSY) даже после ${RETRIES} попыток.\n` +
              'Остановите dev-сервер (npm run dev / dev:cf) и повторите.'
          )
        }
        throw new Error(`Ошибка wrangler d1: ${output.trim()}`)
      }
      // stderr подавлен, чтобы не спамить трассировкой workerd; спим и пробуем снова.
      console.log(`База занята (попытка ${attempt}/${RETRIES}), ждём…`)
      execSync(process.platform === 'win32' ? 'ping -n 2 127.0.0.1 >nul' : 'sleep 1')
    }
  }
}

function query(sql: string): Record<string, unknown>[] {
  return parseWranglerJson(execSql(sql))
}

const sqlQuote = (value: string): string => value.replace(/'/g, "''")

// ---------- аргументы ----------

function parseArgs(): { email?: string; password?: string } {
  const argv = process.argv.slice(2)
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag)
    return i >= 0 ? argv[i + 1] : undefined
  }
  // Позиционный email: первый аргумент, который не флаг и не значение флага.
  const positional = argv.find((a, i) => !a.startsWith('--') && !argv[i - 1]?.startsWith('--'))
  return {
    email: (get('--email') ?? positional)?.toLowerCase(),
    password: get('--password') ?? process.env.RDD_NEW_PASSWORD,
  }
}

/** Печатает email всех пользователей — чтобы было из чего выбрать при вводе. */
function listUsers(): void {
  const rows = query(`SELECT email, role FROM users ORDER BY email;`)
  if (!rows.length) {
    console.log('⚠️  В базе нет пользователей (сначала npm run user:create)')
    return
  }
  console.log('\nПользователи в локальной базе:')
  for (const row of rows) console.log(`   ${row.email} (${row.role})`)
}

async function main(): Promise<void> {
  const args = parseArgs()
  // Интерактив только при TTY: в CI/агенте скрипт не должен висеть на вопросе.
  const rl = isInteractive() ? makeRl() : null

  try {
    let email = args.email ?? ''
    let password = args.password ?? ''

    if (!email) {
      if (!rl) {
        listUsers()
        throw new Error(
          'Укажите email: npx tsx scripts/reset-password-local.ts user@example.com ' +
            '(в интерактивном терминале email спросят сами)'
        )
      }
      listUsers()
      email = (await ask(rl, 'Email')).toLowerCase()
      if (!email) throw new Error('Email не указан')
    }

    const existing = query(
      `SELECT id, password_hash FROM users WHERE email = '${sqlQuote(email)}';`
    )
    if (!existing.length) {
      if (rl) listUsers()
      throw new Error(`Пользователь ${email} не найден`)
    }

    if (!password) {
      if (!rl) {
        throw new Error(
          'Пароль не передан. Задайте RDD_NEW_PASSWORD=<пароль> или запустите в терминале — ' +
            'пароль спросят со скрытием эха'
        )
      }
      // Цикл повторов: слишком короткий или несовпадающий пароль — снова вопрос.
      for (;;) {
        const first = await askHidden(
          `Новый пароль (ввод скрыт, минимум ${MIN_PASSWORD_LENGTH} символов): `
        )
        if (first.length < MIN_PASSWORD_LENGTH) {
          console.log(`⚠️  Минимум ${MIN_PASSWORD_LENGTH} символов, введено ${first.length}`)
          continue
        }
        const repeat = await askHidden('Повторите пароль: ')
        if (first !== repeat) {
          console.log('⚠️  Пароли не совпадают, попробуйте ещё раз')
          continue
        }
        password = first
        break
      }
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(`Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов`)
    }

    const oldHash = String(existing[0]?.password_hash ?? '')
    const oldIterations = Number(oldHash.split('$')[1])
    console.log(`\nПользователь: ${email}`)
    console.log(`Текущий хеш: pbkdf2, итераций ${oldIterations || 'неизвестно'}`)

    const hash = await hashPassword(password)
    console.log(`Новый хеш:    pbkdf2, итераций ${hash.split('$')[1]}`)

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
    if (!(await verifyPassword(password, stored)))
      throw new Error('Проверка после записи не прошла')

    const state = query(
      `SELECT email, role, must_change_password, failed_attempts, locked_until FROM users WHERE email = '${sqlQuote(email)}';`
    )
    console.log('✅ Пароль обновлён:', state[0])
  } finally {
    // close() идемпотентен: askHidden уже закрывает свой собственный интерфейс.
    rl?.close()
  }
}

main().catch((e: unknown) => {
  console.error(`❌ ${e instanceof Error ? e.message : e}`)
  process.exit(1)
})
