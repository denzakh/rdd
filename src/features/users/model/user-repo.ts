/**
 * Репозиторий пользователей (admin-UI, docs/spec-stage-3.md §5).
 * Все мутации пишут запись в audit_log (patient_id = 0 — не клиническое событие).
 * Только server-окружение (getDb() → Cloudflare binding).
 */
import { randomUUID } from 'node:crypto'

export type Role = 'admin' | 'clinician' | 'readonly'
export const ROLES: readonly Role[] = ['admin', 'clinician', 'readonly'] as const

export interface AdminUser {
  id: string
  email: string
  displayName: string
  role: Role
  lockedUntil: string | null
  failedAttempts: number
  mustChangePassword: boolean
  createdAt: string
}

interface UserRow {
  id: string
  email: string
  display_name: string
  role: Role
  locked_until: string | null
  failed_attempts: number
  must_change_password: number
  created_at: string
}

const toAdminUser = (r: UserRow): AdminUser => ({
  id: r.id,
  email: r.email,
  displayName: r.display_name,
  role: r.role,
  lockedUntil: r.locked_until,
  failedAttempts: r.failed_attempts,
  mustChangePassword: r.must_change_password === 1,
  createdAt: r.created_at,
})

const AUDIT_SQL =
  'INSERT INTO audit_log (actor_id, patient_id, field_id, action, new_value) VALUES (?, 0, ?, ?, ?)'

/** Запись мутации пользователя в audit_log (docs/spec-stage-3.md §5, §7.5). */
export function auditUser(
  db: D1Database,
  actorId: string,
  action: string,
  targetUserId: string,
  details: Record<string, unknown> = {}
): D1PreparedStatement {
  return db
    .prepare(AUDIT_SQL)
    .bind(actorId, `user:${action}`, JSON.stringify({ userId: targetUserId, ...details }))
}

export async function listUsers(db: D1Database): Promise<AdminUser[]> {
  const { results } = await db
    .prepare(
      `SELECT id, email, display_name, role, locked_until, failed_attempts,
              must_change_password, created_at
       FROM users ORDER BY created_at`
    )
    .all<UserRow>()
  return results.map(toAdminUser)
}

export async function countAdmins(db: D1Database): Promise<number> {
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM users WHERE role = 'admin'`)
    .bind()
    .first<{ n: number }>()
  return row?.n ?? 0
}

export interface NewUserData {
  email: string
  passwordHash: string
  displayName: string
  role: Role
  mustChangePassword?: boolean
}

/** Создание пользователя (аналог scripts/create-user.ts, но из admin-UI). */
export async function createUser(db: D1Database, data: NewUserData): Promise<string> {
  const id = randomUUID()
  await db
    .prepare(
      `INSERT INTO users (id, email, password_hash, display_name, role, must_change_password)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      data.email.toLowerCase(),
      data.passwordHash,
      data.displayName,
      data.role,
      data.mustChangePassword ? 1 : 0
    )
    .run()
  return id
}

export async function findUserById(db: D1Database, id: string): Promise<AdminUser | null> {
  const row = await db
    .prepare(
      `SELECT id, email, display_name, role, locked_until, failed_attempts,
              must_change_password, created_at
       FROM users WHERE id = ?`
    )
    .bind(id)
    .first<UserRow>()
  return row ? toAdminUser(row) : null
}

export async function changeRole(db: D1Database, id: string, role: Role): Promise<void> {
  await db
    .prepare(
      `UPDATE users SET role = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`
    )
    .bind(role, id)
    .run()
}

/** lock/unlock: lockedUntil = ISO или NULL. */
export async function setLock(
  db: D1Database,
  id: string,
  lockedUntil: string | null
): Promise<void> {
  await db
    .prepare(
      `UPDATE users SET locked_until = ?,
       failed_attempts = CASE WHEN ? IS NULL THEN 0 ELSE failed_attempts END,
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`
    )
    .bind(lockedUntil, lockedUntil, id)
    .run()
}

/** Сброс пароля: новый хэш + принудительная смена при следующем входе. */
export async function resetPassword(
  db: D1Database,
  id: string,
  passwordHash: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE users SET password_hash = ?, must_change_password = 1,
       failed_attempts = 0, locked_until = NULL,
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`
    )
    .bind(passwordHash, id)
    .run()
}

export async function isEmailTaken(db: D1Database, email: string): Promise<boolean> {
  return (
    (await db
      .prepare('SELECT COUNT(*) AS n FROM users WHERE email = ?')
      .bind(email.toLowerCase())
      .first<{ n: number }>())!.n > 0
  )
}
