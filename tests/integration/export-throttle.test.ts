import { afterAll, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { EXPORT_THROTTLE_SECONDS, tryClaimExportSlot } from '@/shared/api/export-throttle'
import { disposeTestDb, getTestDb } from '../helpers/db'

afterAll(disposeTestDb)

async function makeUser(db: D1Database): Promise<string> {
  const id = randomUUID()
  await db
    .prepare(
      `INSERT INTO users (id, email, password_hash, display_name, role)
       VALUES (?, ?, 'pbkdf2$1$00$00', 'Test', 'clinician')`
    )
    .bind(id, `export-${id}@test.local`)
    .run()
  return id
}

async function cleanupUser(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id).run()
  await db.prepare('DELETE FROM users WHERE id = ?').bind(id).run()
}

describe('export-throttle (интеграция, локальная D1)', () => {
  it('первый экспорт разрешён, повторный в окне — отклонён с retryAfter', async () => {
    const db = await getTestDb()
    const userId = await makeUser(db)
    try {
      const now = new Date()
      const first = await tryClaimExportSlot(db, userId, now)
      expect(first).toEqual({ allowed: true, retryAfterSeconds: 0 })

      const second = await tryClaimExportSlot(db, userId, now)
      expect(second.allowed).toBe(false)
      expect(second.retryAfterSeconds).toBeGreaterThan(0)
      expect(second.retryAfterSeconds).toBeLessThanOrEqual(EXPORT_THROTTLE_SECONDS)

      // Повторный отклонённый запрос НЕ продлевает окно: метка осталась от первого.
      const later = new Date(now.getTime() + (EXPORT_THROTTLE_SECONDS + 1) * 1000)
      const third = await tryClaimExportSlot(db, userId, later)
      expect(third).toEqual({ allowed: true, retryAfterSeconds: 0 })
    } finally {
      await cleanupUser(db, userId)
    }
  })

  it('окно не продлевается отклонёнными запросами; изоляция между пользователями', async () => {
    const db = await getTestDb()
    const userA = await makeUser(db)
    const userB = await makeUser(db)
    try {
      const t0 = new Date()
      expect((await tryClaimExportSlot(db, userA, t0)).allowed).toBe(true)
      // Отклонённый запрос в середине окна…
      const tMid = new Date(t0.getTime() + 10_000)
      expect((await tryClaimExportSlot(db, userA, tMid)).allowed).toBe(false)
      // …не сдвигает окно: слот свободен ровно через 60 с от t0.
      const tEnd = new Date(t0.getTime() + (EXPORT_THROTTLE_SECONDS + 1) * 1000)
      expect((await tryClaimExportSlot(db, userA, tEnd)).allowed).toBe(true)

      // Другой пользователь не затронут троттлингом первого.
      expect((await tryClaimExportSlot(db, userB, tMid)).allowed).toBe(true)
    } finally {
      await cleanupUser(db, userA)
      await cleanupUser(db, userB)
    }
  })

  it('неизвестный пользователь — fail closed (слот не выдаётся)', async () => {
    const db = await getTestDb()
    const slot = await tryClaimExportSlot(db, randomUUID())
    expect(slot.allowed).toBe(false)
    expect(slot.retryAfterSeconds).toBe(EXPORT_THROTTLE_SECONDS)
  })
})
