import { afterAll, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { createPatientRepository, patientScopeFor, PATIENT_SCOPE_ALL } from '@/entities/patient'
import type { SessionUser } from '@/shared/api/session-repo'
import { cleanupPatient, disposeTestDb, getTestDb } from '../helpers/db'

/**
 * Row-level access (migrations/0005_data_scope.sql):
 * аутентификация (роль) и авторизация на уровне данных (scope) — разные вещи.
 * Проверяем, что ограниченный репозиторий фильтрует list/listPage/count/findById.
 */

const mkUser = (
  dataScope: 'all' | 'site' | 'assigned',
  siteId: string | null = null
): SessionUser => ({
  id: randomUUID(),
  email: 'u@test.local',
  displayName: 'Test',
  role: 'clinician',
  dataScope,
  siteId,
  mustChangePassword: false,
})

const sample = (siteId: string | null, clinicianId: string | null) => ({
  study_entry_date: '2025-01-10',
  birth_year: 1980,
  gender: 1,
  education_level: null,
  career_level: null,
  living_status: null,
  disability_status: null,
  family_history: null,
  personality_type: null,
  site_id: siteId,
  assigned_clinician_id: clinicianId,
})

/** Тестовый clinician в users (assigned_clinician_id → users.id, FK). */
async function createClinicianUser(db: D1Database, id: string): Promise<void> {
  await db
    .prepare(
      `INSERT INTO users (id, email, password_hash, display_name, role, data_scope, site_id)
       VALUES (?, ?, 'pbkdf2$1$00$00', 'Clin', 'clinician', 'all', NULL)`
    )
    .bind(id, `c-${id}@test.local`)
    .run()
}
const removeClinicianUser = (db: D1Database, id: string): Promise<unknown> =>
  db.prepare('DELETE FROM users WHERE id = ?').bind(id).run()

afterAll(disposeTestDb)

describe('patient-repo: row-level access (data_scope)', () => {
  it('scope site/assigned фильтрует list/listPage/count/findById; all видит всех', async () => {
    const db = await getTestDb()
    const admin = createPatientRepository(db, PATIENT_SCOPE_ALL)

    const siteA = 'site-a'
    const clinician = randomUUID()
    const otherClinician = randomUUID()
    await createClinicianUser(db, clinician)
    await createClinicianUser(db, otherClinician)
    const idA1 = await admin.create(sample(siteA, clinician)) // центр A, назначен врачу
    const idA2 = await admin.create(sample(siteA, otherClinician)) // центр A, другой врач
    const idB = await admin.create(sample('site-b', clinician)) // центр B, назначен врачу

    try {
      // 'all' — всё видно
      const allRepo = createPatientRepository(db, patientScopeFor(mkUser('all')))
      expect((await allRepo.list()).length).toBeGreaterThanOrEqual(3)
      expect(await allRepo.findById(idB)).not.toBeNull()

      // 'site' (центр A) — только пациенты центра A
      const siteRepo = createPatientRepository(db, patientScopeFor(mkUser('site', siteA)))
      const siteList = await siteRepo.list()
      expect(siteList.map((p) => p.id)).toEqual(expect.arrayContaining([idA1, idA2]))
      expect(siteList.map((p) => p.id)).not.toContain(idB)
      expect(await siteRepo.count()).toBe(siteList.length)
      expect(await siteRepo.findById(idB)).toBeNull() // IDOR закрыт
      expect(await siteRepo.findById(idA1)).not.toBeNull()

      // 'site' без привязки к центру — fail closed, пусто
      const noSiteRepo = createPatientRepository(db, patientScopeFor(mkUser('site', null)))
      expect(await noSiteRepo.list()).toEqual([])
      expect(await noSiteRepo.count()).toBe(0)

      // 'assigned' — только назначенные этому врачу (id = clinician из карт)
      const assignedRepo = createPatientRepository(
        db,
        patientScopeFor({ ...mkUser('assigned'), id: clinician })
      )
      const assignedList = await assignedRepo.list()
      expect(assignedList.map((p) => p.id)).toEqual(expect.arrayContaining([idA1, idB]))
      expect(assignedList.map((p) => p.id)).not.toContain(idA2)
      expect(await assignedRepo.findById(idA2)).toBeNull()

      // listPage с поиском уважает scope: чужой id не находится
      const page = await siteRepo.listPage({ q: String(idB), limit: 10, offset: 0 })
      expect(page).toEqual([])
      const pageOwn = await siteRepo.listPage({ q: String(idA1), limit: 10, offset: 0 })
      expect(pageOwn.map((p) => p.id)).toEqual([idA1])
    } finally {
      for (const id of [idA1, idA2, idB]) await cleanupPatient(db, id)
      await removeClinicianUser(db, clinician)
      await removeClinicianUser(db, otherClinician)
    }
  })
})
