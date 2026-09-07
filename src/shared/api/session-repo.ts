/**
 * Репозиторий сессий (migrations/0003_auth.sql).
 *
 * Схема безопасности:
 * - токен сессии (32 байта, base64url) живёт ТОЛЬКО в HttpOnly cookie;
 * - в БД хранится SHA-256(токен) — утечка базы не даёт угнать сессии;
 * - TTL 12 часов (смена в клинике), sliding renewal при половине срока.
 *
 * Только server-окружение (getDb() → Cloudflare binding).
 */
import { createHash } from '../lib/hash'

export const SESSION_COOKIE = 'rdd_session'
export const SESSION_TTL_HOURS = 12
const RENEW_THRESHOLD_HOURS = 6

export interface SessionUser {
  id: string
  email: string
  displayName: string
  role: 'admin' | 'clinician' | 'readonly'
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
  must_change_password: number
  failed_attempts: number
  locked_until: string | null
}

const USER_COLUMNS =
  'id, email, display_name, role, must_change_password, failed_attempts, locked_until'

const toSessionUser = (row: UserRow): SessionUser => ({
  id: row.id,
  email: row.email,
  displayName: row.display_name,
  role: row.role,
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
 * При остатке < RENEW_THRESHOLD_HOURS продлевает сессию (sliding renewal).
 */
export async function findSessionUser(db: D1Database, token: string): Promise<SessionUser | null> {
  const tokenHash = await hashToken(token)

  interface JoinRow extends UserRow {
    expires_at: string
  }
  const row = await db
    .prepare(
      `SELECT u.id, u.email, u.display_name, u.role, u.must_change_password, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.id = ?`
    )
    .bind(tokenHash)
    .first<JoinRow>()

  if (!row) return null

  if (new Date(row.expires_at) <= new Date()) {
    await db.prepare('DELETE FROM sessions WHERE id = ?').bind(tokenHash).run()
    return null
  }

  const remainingMs = new Date(row.expires_at).getTime() - Date.now()
  if (remainingMs < RENEW_THRESHOLD_HOURS * 3600_000) {
    await db
      .prepare('UPDATE sessions SET expires_at = ? WHERE id = ?')
      .bind(expiryIso(), tokenHash)
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

// --- rate-limit входа (docs/spec-stage-3.md §3) ---

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
