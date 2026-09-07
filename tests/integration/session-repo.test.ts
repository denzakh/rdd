import { afterAll, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import {
  createSession,
  destroySession,
  findSessionUser,
  hashToken,
  purgeExpiredSessions,
} from '@/shared/api/session-repo'
import { disposeTestDb, getTestDb } from '../helpers/db'

afterAll(disposeTestDb)

async function makeUser(db: D1Database): Promise<string> {
  const id = randomUUID()
  await db
    .prepare(
      `INSERT INTO users (id, email, password_hash, display_name, role)
       VALUES (?, ?, 'pbkdf2$1$00$00', 'Test', 'clinician')`
    )
    .bind(id, `t-${id}@test.local`)
    .run()
  return id
}

async function cleanupUser(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id).run()
  await db.prepare('DELETE FROM users WHERE id = ?').bind(id).run()
}

describe('session-repo (интеграция, локальная D1)', () => {
  it('создание → валидация → destroy (идемпотентно)', async () => {
    const db = await getTestDb()
    const userId = await makeUser(db)
    try {
      const token = await createSession(db, userId, 'vitest-agent')
      const user = await findSessionUser(db, token)
      expect(user?.id).toBe(userId)
      expect(user?.displayName).toBe('Test')
      expect(user?.mustChangePassword).toBe(false)

      await destroySession(db, token)
      expect(await findSessionUser(db, token)).toBeNull()
      // повторный destroy не бросает
      await expect(destroySession(db, token)).resolves.toBeUndefined()
    } finally {
      await cleanupUser(db, userId)
    }
  })

  it('sliding renewal: остаток < 6 ч продлевается до 12 ч', async () => {
    const db = await getTestDb()
    const userId = await makeUser(db)
    try {
      const token = await createSession(db, userId)
      // вручную укорачиваем сессию до 5 часов
      const soon = new Date(Date.now() + 5 * 3600_000).toISOString()
      await db
        .prepare('UPDATE sessions SET expires_at = ? WHERE user_id = ?')
        .bind(soon, userId)
        .run()

      const before = new Date(soon).getTime()
      await findSessionUser(db, token)

      const row = await db
        .prepare('SELECT expires_at FROM sessions WHERE user_id = ?')
        .bind(userId)
        .first<{ expires_at: string }>()
      const renewed = new Date(row!.expires_at).getTime()
      // продлили до полных 12 часов (±минута)
      expect(renewed - before).toBeGreaterThan(6 * 3600_000 - 60_000)
    } finally {
      await cleanupUser(db, userId)
    }
  })

  it('истёкшая сессия удаляется при валидации; purgeExpiredSessions чистит всё', async () => {
    const db = await getTestDb()
    const userId = await makeUser(db)
    try {
      const token = await createSession(db, userId)
      const tokenHash = await hashToken(token)
      await db
        .prepare(
          `UPDATE sessions SET expires_at = strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 hour')
           WHERE user_id = ?`
        )
        .bind(userId)
        .run()

      expect(await findSessionUser(db, token)).toBeNull()
      // строка удалена при валидации
      const row = await db
        .prepare('SELECT COUNT(*) AS n FROM sessions WHERE id = ?')
        .bind(tokenHash)
        .first<{ n: number }>()
      expect(row?.n).toBe(0)

      // purge по истёкшим
      await createSession(db, userId)
      await db
        .prepare(
          `UPDATE sessions SET expires_at = strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 day')
           WHERE user_id = ?`
        )
        .bind(userId)
        .run()
      await purgeExpiredSessions(db)
      const left = await db
        .prepare('SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?')
        .bind(userId)
        .first<{ n: number }>()
      expect(left?.n).toBe(0)
    } finally {
      await cleanupUser(db, userId)
    }
  })

  it('токен не хранится в открытом виде: в БД SHA-256 hex', async () => {
    const db = await getTestDb()
    const userId = await makeUser(db)
    try {
      const token = await createSession(db, userId)
      const row = await db
        .prepare('SELECT id FROM sessions WHERE user_id = ?')
        .bind(userId)
        .first<{ id: string }>()
      expect(row?.id).toMatch(/^[0-9a-f]{64}$/)
      expect(row?.id).not.toBe(token)
    } finally {
      await cleanupUser(db, userId)
    }
  })
})
