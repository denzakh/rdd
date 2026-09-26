/**
 * Общие параметры cookie сессии.
 *
 * Единая точка для local и авто-логина по инвайту: раньше `secure: true` был
 * захардкожен в обоих местах, и по http (локальная разработка, http://localhost
 * или LAN-адрес без TLS) браузер молча отбрасывал cookie — вход выглядел
 * успешным (редирект на /patients), но middleware тут же выкидывал обратно на
 * /login. Симптом крайне обманчив: пароль верный, ошибок нет.
 *
 * Логика: Secure ставим только когда соединение действительно защищено —
 * ориентируемся на x-forwarded-proto (его ставит CF/реверс-прокси) иначе на
 * заголовок upgrade. На проде домен за Cloudflare — там always https.
 */
import { headers } from 'next/headers'
import { SESSION_TTL_HOURS } from './session-repo'

/** Защищено ли соединение: x-forwarded-proto важнее upgrade (CF ходит по TLS через прокси). */
export async function isSecureRequest(): Promise<boolean> {
  const hdrs = await headers()
  const forwardedProto = hdrs.get('x-forwarded-proto')
  if (forwardedProto) return forwardedProto.split(',')[0]?.trim() === 'https'
  // Нет прокси — ориентируемся на апгрейд соединения до TLS.
  return hdrs.get('upgrade')?.toLowerCase() === 'https'
}

/** Параметры для cookies().set(...) — с корректным secure для текущего окружения. */
export async function sessionCookieOptions(): Promise<{
  httpOnly: true
  secure: boolean
  sameSite: 'lax'
  path: '/'
  maxAge: number
}> {
  return {
    httpOnly: true,
    secure: await isSecureRequest(),
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_HOURS * 3600,
  }
}
