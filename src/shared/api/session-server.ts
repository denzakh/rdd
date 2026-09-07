/**
 * Серверная сессия приложения (слой shared, docs/spec-stage-2.md):
 * чтение cookie → валидация в D1. Используется из server components
 * и server actions; features импортируют отсюда (без кросс-импортов).
 */
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getDb } from './db'
import { findSessionUser, SESSION_COOKIE, type SessionUser } from './session-repo'

/** Текущий пользователь или null (без редиректа). */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  return findSessionUser(await getDb(), token)
}

/**
 * Текущий пользователь с редиректом на /login, если сессии нет.
 * Для серверных страниц и действий, требующих авторизации.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return user
}
