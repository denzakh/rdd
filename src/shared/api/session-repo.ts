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
}

const toSessionUser = (row: UserRow): SessionUser => ({
  id: row.id,
  email: row.email,
  displayName: row.display_name,
  role: row.role,
  mustChangePassword: row.must_change_password === 1,
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

/** Поиск пользователя по email (login). */
export async function findUserByEmail(
  db: D1Database,
  email: string
): Promise<(SessionUser & { passwordHash: string }) | null> {
  const row = await db
    .prepare(
      'SELECT id, email, display_name, role, must_change_password, password_hash FROM users WHERE email = ?'
    )
    .bind(email.toLowerCase())
    .first<UserRow & { password_hash: string }>()
  if (!row) return null
  return { ...toSessionUser(row), passwordHash: row.password_hash }
}

/** Право изменять данные (для будущих API/Server Actions). */
export const canWrite = (user: SessionUser): boolean => user.role !== 'readonly'
