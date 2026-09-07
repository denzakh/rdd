/**
 * Репозиторий инвайтов (docs/spec-stage-3.md §6).
 * В БД — только SHA-256(токен); сам токен живёт в ссылке, выдаётся админу один раз.
 */
import { randomUUID } from 'node:crypto'
import { hashToken } from '@/shared/api'

export const INVITE_TTL_DAYS = 7

export type InviteRole = 'admin' | 'clinician' | 'readonly'

export interface Invite {
  id: string
  email: string
  role: InviteRole
  createdAt: string
  expiresAt: string
  usedAt: string | null
}

const toInvite = (r: {
  id: string
  email: string
  role: InviteRole
  created_at: string
  expires_at: string
  used_at: string | null
}): Invite => ({
  id: r.id,
  email: r.email,
  role: r.role,
  createdAt: r.created_at,
  expiresAt: r.expires_at,
  usedAt: r.used_at,
})

/** Создаёт инвайт, возвращает одноразовый токен для ссылки /invite/<token>. */
export async function createInvite(
  db: D1Database,
  email: string,
  role: InviteRole,
  createdBy: string
): Promise<string> {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const token = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  await db
    .prepare(
      `INSERT INTO invites (id, token_hash, email, role, created_by, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(
      randomUUID(),
      await hashToken(token),
      email.toLowerCase(),
      role,
      createdBy,
      new Date(Date.now() + INVITE_TTL_DAYS * 24 * 3600_000).toISOString()
    )
    .run()
  return token
}

/** Валидация токена: существует, не использован, не истёк. */
export async function findValidInvite(db: D1Database, token: string): Promise<Invite | null> {
  const row = await db
    .prepare(
      `SELECT id, email, role, created_at, expires_at, used_at
       FROM invites WHERE token_hash = ?`
    )
    .bind(await hashToken(token))
    .first<{
      id: string
      email: string
      role: InviteRole
      created_at: string
      expires_at: string
      used_at: string | null
    }>()
  if (!row) return null
  const invite = toInvite(row)
  if (invite.usedAt !== null || new Date(invite.expiresAt) <= new Date()) return null
  return invite
}

/** Помечает инвайт использованным (после создания пользователя). */
export function markInviteUsedStatement(db: D1Database, inviteId: string): D1PreparedStatement {
  return db
    .prepare(`UPDATE invites SET used_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`)
    .bind(inviteId)
}

export async function markInviteUsed(db: D1Database, inviteId: string): Promise<void> {
  await markInviteUsedStatement(db, inviteId).run()
}

/** Активные (не использованные и не истёкшие) инвайты для admin-UI. */
export async function listActiveInvites(db: D1Database): Promise<Invite[]> {
  const { results } = await db
    .prepare(
      `SELECT id, email, role, created_at, expires_at, used_at FROM invites
       WHERE used_at IS NULL AND expires_at > strftime('%Y-%m-%dT%H:%M:%fZ','now')
       ORDER BY created_at DESC`
    )
    .all<{
      id: string
      email: string
      role: InviteRole
      created_at: string
      expires_at: string
      used_at: string | null
    }>()
  return results.map(toInvite)
}

/** Отзыв инвайта (удаление записи). */
export async function revokeInvite(db: D1Database, inviteId: string): Promise<void> {
  await db.prepare('DELETE FROM invites WHERE id = ?').bind(inviteId).run()
}
