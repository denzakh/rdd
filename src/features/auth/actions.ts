'use server'

/**
 * Server Actions авторизации: login/logout.
 * Ограничение перебора: простая задержка при неверном пароле + общий
 * purge истёкших сессий (полноценный rate-limit — при эскалации, см. docs).
 */
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getDb } from '@/shared/api/db'
import {
  createSession,
  destroySession,
  findUserByEmail,
  purgeExpiredSessions,
  SESSION_COOKIE,
  SESSION_TTL_HOURS,
} from '@/shared/api/session-repo'
import { verifyPassword } from '@/shared/lib/password'

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

  // Одинаковая задержка для неизвестного email и неверного пароля —
  // не раскрываем существование учётной записи.
  const ok = user ? await verifyPassword(password, user.passwordHash) : false
  if (!user || !ok) {
    await new Promise((r) => setTimeout(r, 400))
    return { error: 'Неверный email или пароль' }
  }

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
