'use server'

/**
 * Server Actions авторизации: login/logout.
 * Ограничение перебора: простая задержка при неверном пароле + общий
 * purge истёкших сессий (полноценный rate-limit — при эскалации, см. docs).
 */
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  createSession,
  destroySession,
  findUserByEmail,
  getDb,
  hashToken,
  isLocked,
  purgeExpiredSessions,
  registerFailedLogin,
  requireUser,
  resetLoginFailures,
  SESSION_COOKIE,
  SESSION_TTL_HOURS,
} from '@/shared/api'
import { hashPassword, MIN_PASSWORD_LENGTH, verifyPassword } from '@/shared/lib/password'

export interface LoginState {
  error?: string
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) return { error: 'Введите email и пароль' }

  const db = await getDb()
  const user = await findUserByEmail(db, email)

  // Rate-limit (docs/ru/spec-stage-3.md §3): заблокированная учётка отклоняется
  // до проверки пароля. Одинаковая задержка сохранена.
  if (user && isLocked(user)) {
    await new Promise((r) => setTimeout(r, 400))
    return { error: 'Аккаунт временно заблокирован. Попробуйте позже.' }
  }

  // Одинаковая задержка для неизвестного email и неверного пароля —
  // не раскрываем существование учётной записи.
  const ok = user ? await verifyPassword(password, user.passwordHash!) : false
  if (!user || !ok) {
    await new Promise((r) => setTimeout(r, 400))
    if (user) await registerFailedLogin(db, user.id)
    return { error: 'Неверный email или пароль' }
  }

  await resetLoginFailures(db, user.id)
  await purgeExpiredSessions(db)
  const hdrs = await headers()
  const token = await createSession(db, user.id, hdrs.get('user-agent') ?? undefined)

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_HOURS * 3600,
  })

  redirect('/patients')
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (token) await destroySession(await getDb(), token)
  cookieStore.delete(SESSION_COOKIE)
  redirect('/login')
}

// --- смена пароля (docs/ru/spec-stage-3.md §4) ---

export interface ChangePasswordState {
  error?: string
  ok?: boolean
}

export async function changePasswordAction(
  _prev: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const user = await requireUser()

  const current = String(formData.get('current') ?? '')
  const next = String(formData.get('password') ?? '')
  const repeat = String(formData.get('repeat') ?? '')

  if (next.length < MIN_PASSWORD_LENGTH) {
    return { error: `Новый пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов` }
  }
  if (next !== repeat) return { error: 'Пароли не совпадают' }

  const db = await getDb()
  const full = await findUserByEmail(db, user.email)
  if (!full?.passwordHash || !(await verifyPassword(current, full.passwordHash))) {
    return { error: 'Текущий пароль неверен' }
  }

  const token = (await cookies()).get(SESSION_COOKIE)?.value
  await db.batch([
    db
      .prepare(
        `UPDATE users SET password_hash = ?, must_change_password = 0,
         failed_attempts = 0, locked_until = NULL, updated_at = ? WHERE id = ?`
      )
      .bind(await hashPassword(next), new Date().toISOString(), user.id),
    // Инвалидация всех прочих сессий пользователя (кроме текущей)
    db
      .prepare('DELETE FROM sessions WHERE user_id = ? AND id != ?')
      .bind(user.id, token ? await hashToken(token) : ''),
  ])

  return { ok: true }
}
