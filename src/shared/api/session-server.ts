'use server'

/**
 * Серверная сессия приложения (слой shared, docs/ru/spec-stage-2.md):
 * чтение cookie → валидация в D1. Используется из server components
 * и server actions; features импортируют отсюда (без кросс-импортов).
 */
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getDb } from './db'
import { findSessionUser, SESSION_COOKIE, type SessionUser } from './session-repo'

/** Маршруты, доступные при must_change_password=1 (кроме /login, он и так открыт). */
const CHANGE_PASSWORD_PATH = '/change-password'

/** Текущий путь запроса (x-pathname ставит middleware). */
async function currentPath(): Promise<string> {
  const h = await headers()
  return h.get('x-pathname') ?? ''
}

/** Текущий пользователь или null (без редиректа). */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  return findSessionUser(await getDb(), token)
}

/**
 * Безопасная версия для публичных страниц (docs/ru/spec-public-1.md §1 п.2):
 * в обычном `next dev` нет CF-контекста и `getDb()` бросает — витрина
 * должна отрендериться как для гостя, а не упасть с 500.
 */
export async function getCurrentUserSafe(): Promise<SessionUser | null> {
  try {
    return await getCurrentUser()
  } catch {
    return null
  }
}

/**
 * Текущий пользователь с редиректом на /login, если сессии нет.
 * Для серверных страниц и действий, требующих авторизации.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  // Принудительная смена пароля (docs/ru/spec-stage-3.md §4)
  if (user.mustChangePassword) {
    const path = await currentPath()
    if (path !== CHANGE_PASSWORD_PATH && !path.startsWith('/invite/')) {
      redirect(CHANGE_PASSWORD_PATH)
    }
  }
  return user
}
