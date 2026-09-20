/**
 * Репозиторий пользователей (admin-UI, docs/ru/spec-stage-3.md §5).
 * Все мутации пишут запись в audit_log (patient_id = 0 — не клиническое событие).
 * Только server-окружение (getDb() → Cloudflare binding).
 */
import { randomUUID } from 'node:crypto'
import { createAuditRepository, type AuditEntry } from '@/shared/api'

export type Role = 'admin' | 'clinician' | 'readonly'
export const ROLES: readonly Role[] = ['admin', 'clinician', 'readonly'] as const

export type DataScope = 'all' | 'site' | 'assigned'
export const DATA_SCOPES: readonly DataScope[] = ['all', 'site', 'assigned'] as const

export const DATA_SCOPE_LABELS: Record<DataScope, string> = {
  all: 'все пациенты',
  site: 'свой центр',
  assigned: 'только назначенные',
}

export interface AdminUser {
  id: string
  email: string
  displayName: string
  role: Role
  dataScope: DataScope
  siteId: string | null
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
  data_scope: DataScope
  site_id: string | null
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
  dataScope: r.data_scope ?? 'all',
  siteId: r.site_id,
  lockedUntil: r.locked_until,
  failedAttempts: r.failed_attempts,
  mustChangePassword: r.must_change_password === 1,
  createdAt: r.created_at,
})

/** Содержимое audit-записи мутации пользователя (patient_id = 0 — не клиническое событие). */
export function auditUserEntry(
  actorId: string,
  action: string,
  targetUserId: string,
  details: Record<string, unknown> = {}
): AuditEntry {
  return {
    actorId,
    patientId: 0,
    fieldId: `user:${action}`,
    action: `user:${action}`,
    newValue: { userId: targetUserId, ...details },
  }
}

/**
 * Запись мутации пользователя в audit_log (docs/ru/spec-stage-3.md §5, §7.5).
 * Пишется через createAuditRepository — с hash-chain целостностью
 * (migrations/0006_audit_hash_chain.sql, docs/ru/threat-model.md §2 R).
 */
export async function auditUser(
  db: D1Database,
  actorId: string,
  action: string,
  targetUserId: string,
  details: Record<string, unknown> = {}
): Promise<void> {
  await createAuditRepository(db).insert(auditUserEntry(actorId, action, targetUserId, details))
}

export async function listUsers(db: D1Database): Promise<AdminUser[]> {
  const { results } = await db
    .prepare(
      `SELECT id, email, display_name, role, data_scope, site_id, locked_until, failed_attempts,
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
  dataScope?: DataScope
  siteId?: string | null
  mustChangePassword?: boolean
}

/** Создание пользователя (аналог scripts/create-user.ts, но из admin-UI). */
export async function createUser(db: D1Database, data: NewUserData): Promise<string> {
  const id = randomUUID()
  await db
    .prepare(
      `INSERT INTO users (id, email, password_hash, display_name, role, data_scope, site_id, must_change_password)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      data.email.toLowerCase(),
      data.passwordHash,
      data.displayName,
      data.role,
      data.dataScope ?? 'all',
      data.siteId ?? null,
      data.mustChangePassword ? 1 : 0
    )
    .run()
  return id
}

export async function findUserById(db: D1Database, id: string): Promise<AdminUser | null> {
  const row = await db
    .prepare(
      `SELECT id, email, display_name, role, data_scope, site_id, locked_until, failed_attempts,
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

/** Изменение data_scope и site_id (переключатель "видит всех / своих"). */
export async function changeDataScope(
  db: D1Database,
  id: string,
  dataScope: DataScope,
  siteId: string | null
): Promise<void> {
  await db
    .prepare(
      `UPDATE users SET data_scope = ?, site_id = ?,
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`
    )
    .bind(dataScope, dataScope === 'site' ? siteId : null, id)
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
