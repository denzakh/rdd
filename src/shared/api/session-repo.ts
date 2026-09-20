/**
 * Репозиторий сессий (migrations/0003_auth.sql).
 *
 * Схема безопасности:
 * - токен сессии (32 байта, base64url) живёт ТОЛЬКО в HttpOnly cookie;
 * - в БД хранится SHA-256(токен) — утечка базы не даёт угнать сессии;
 * - TTL 12 часов (смена в клинике), sliding renewal при половине срока;
 * - абсолютный потолок SESSION_ABSOLUTE_TTL_DAYS (7 дней с момента логина):
 *   containment при краже токена — sliding renewal не может продлить сессию
 *   за пределы потолка (docs/ru/auth.md).
 *
 * Только server-окружение (getDb() → Cloudflare binding).
 */
import { createHash } from '../lib/hash'

export const SESSION_COOKIE = 'rdd_session'
export const SESSION_TTL_HOURS = 12
const RENEW_THRESHOLD_HOURS = 6
/** Абсолютный потолок жизни сессии с момента логина (sliding renewal не продлевает его). */
export const SESSION_ABSOLUTE_TTL_DAYS = 7

export type DataScope = 'all' | 'site' | 'assigned'

export interface SessionUser {
  id: string
  email: string
  displayName: string
  role: 'admin' | 'clinician' | 'readonly'
  /** Ширина видимости пациентов (row-level access): all / свой центр / назначенные. */
  dataScope: DataScope
  /** Код центра пользователя (для dataScope = 'site'). */
  siteId: string | null
  mustChangePassword: boolean
}

const nowIso = (): string => new Date().toISOString()
const expiryIso = (): string => new Date(Date.now() + SESSION_TTL_HOURS * 3600_000).toISOString()

export async function hashToken(token: string): Promise<string> {
  return createHash('sha-256', token)
}

/** Криптослучайный токен сессии (выдаётся в cookie, в БД не хранится). */
export const generateSessionToken = (): string => {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

interface UserRow {
  id: string
  email: string
  display_name: string
  role: SessionUser['role']
  data_scope: SessionUser['dataScope']
  site_id: string | null
  must_change_password: number
  failed_attempts: number
  locked_until: string | null
}

const USER_COLUMNS =
  'id, email, display_name, role, data_scope, site_id, must_change_password, failed_attempts, locked_until'

const toSessionUser = (row: UserRow): SessionUser => ({
  id: row.id,
  email: row.email,
  displayName: row.display_name,
  role: row.role,
  dataScope: row.data_scope ?? 'all',
  siteId: row.site_id,
  mustChangePassword: row.must_change_password === 1,
})

export interface UserWithSecurity extends SessionUser {
  passwordHash?: string
  failedAttempts: number
  lockedUntil: string | null
}

const toUserWithSecurity = (row: UserRow): UserWithSecurity => ({
  ...toSessionUser(row),
  failedAttempts: row.failed_attempts,
  lockedUntil: row.locked_until,
})

/** Создаёт сессию, возвращает токен для cookie. */
export async function createSession(
  db: D1Database,
  userId: string,
  userAgent?: string
): Promise<string> {
  const token = generateSessionToken()
  await db
    .prepare('INSERT INTO sessions (id, user_id, expires_at, user_agent) VALUES (?, ?, ?, ?)')
    .bind(await hashToken(token), userId, expiryIso(), userAgent ?? null)
    .run()
  return token
}

/**
 * Валидирует токен и возвращает пользователя.
 * Удаляет истёкшие/несуществующие сессии молча (token unknown → null).
 * При остатке < RENEW_THRESHOLD_HOURS продлевает сессию (sliding renewal),
 * но не дальше абсолютного потолка created_at + SESSION_ABSOLUTE_TTL_DAYS.
 */
export async function findSessionUser(db: D1Database, token: string): Promise<SessionUser | null> {
  const tokenHash = await hashToken(token)

  interface JoinRow extends UserRow {
    expires_at: string
    created_at: string
  }
  const row = await db
    .prepare(
      `SELECT u.id, u.email, u.display_name, u.role, u.data_scope, u.site_id,
              u.must_change_password, s.expires_at, s.created_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.id = ?`
    )
    .bind(tokenHash)
    .first<JoinRow>()

  if (!row) return null

  const now = Date.now()
  const expiresMs = new Date(row.expires_at).getTime()
  // Абсолютный потолок: 7 дней с момента логина, продлением не сдвигается.
  const absoluteDeadlineMs =
    new Date(row.created_at).getTime() + SESSION_ABSOLUTE_TTL_DAYS * 86_400_000

  if (expiresMs <= now || absoluteDeadlineMs <= now) {
    await db.prepare('DELETE FROM sessions WHERE id = ?').bind(tokenHash).run()
    return null
  }

  const remainingMs = expiresMs - now
  if (remainingMs < RENEW_THRESHOLD_HOURS * 3600_000) {
    // Продлеваем до полных 12 часов, но не за абсолютный потолок.
    const renewedMs = Math.min(now + SESSION_TTL_HOURS * 3600_000, absoluteDeadlineMs)
    await db
      .prepare('UPDATE sessions SET expires_at = ? WHERE id = ?')
      .bind(new Date(renewedMs).toISOString(), tokenHash)
      .run()
  }

  return toSessionUser(row)
}

/** Удаляет сессию (logout). Идемпотентно. */
export async function destroySession(db: D1Database, token: string): Promise<void> {
  await db
    .prepare('DELETE FROM sessions WHERE id = ?')
    .bind(await hashToken(token))
    .run()
}

/** Периодическая уборка истёкших сессий (можно вызывать при login). */
export async function purgeExpiredSessions(db: D1Database): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(nowIso()).run()
}

/** Поиск пользователя по email (login). Включает поля rate-limit. */
export async function findUserByEmail(
  db: D1Database,
  email: string
): Promise<UserWithSecurity | null> {
  const row = await db
    .prepare(`SELECT ${USER_COLUMNS}, password_hash FROM users WHERE email = ?`)
    .bind(email.toLowerCase())
    .first<UserRow & { password_hash: string }>()
  if (!row) return null
  return { ...toUserWithSecurity(row), passwordHash: row.password_hash }
}

// --- rate-limit входа (docs/ru/spec-stage-3.md §3) ---

export const MAX_FAILED_ATTEMPTS = 5
export const LOCK_MINUTES = 15

/** Неудачная попытка: +1; при достижении порога — блокировка на LOCK_MINUTES. */
export async function registerFailedLogin(db: D1Database, userId: string): Promise<void> {
  await db
    .prepare(
      `UPDATE users SET
         failed_attempts = failed_attempts + 1,
         locked_until = CASE
           WHEN failed_attempts + 1 >= ? THEN ? ELSE locked_until END,
         updated_at = ?
       WHERE id = ?`
    )
    .bind(
      MAX_FAILED_ATTEMPTS,
      new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString(),
      nowIso(),
      userId
    )
    .run()
}

/** Успешный вход сбрасывает счётчик и блокировку. */
export async function resetLoginFailures(db: D1Database, userId: string): Promise<void> {
  await db
    .prepare(
      `UPDATE users SET failed_attempts = 0, locked_until = NULL, updated_at = ? WHERE id = ?`
    )
    .bind(nowIso(), userId)
    .run()
}

/** Учётка заблокирована по rate-limit? */
export const isLocked = (user: { lockedUntil: string | null }): boolean =>
  user.lockedUntil !== null && new Date(user.lockedUntil) > new Date()

/** Право изменять данные (для будущих API/Server Actions). */
export const canWrite = (user: SessionUser): boolean => user.role !== 'readonly'
