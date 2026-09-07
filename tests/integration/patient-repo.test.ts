import { afterAll, describe, expect, it } from 'vitest'
import { createPatientRepository, type PatientInput } from '@/entities/patient'
import { cleanupPatient, disposeTestDb, getTestDb } from '../helpers/db'

const samplePatient = (): PatientInput => ({
  study_entry_date: '2024-03-01',
  birth_year: 1975,
  gender: 1,
  education_level: 3,
  career_level: 2,
  living_status: 2,
  disability_status: 0,
  family_history: 0,
  personality_type: 5,
})

afterAll(disposeTestDb)

describe('patient-repo: CRUD (интеграция, локальная D1)', () => {
  it('create → findById → update → list/listPage/count → remove', async () => {
    const db = await getTestDb()
    const patients = createPatientRepository(db)

    const id = await patients.create(samplePatient())
    expect(Number.isInteger(id) && id > 0).toBe(true)

    const found = await patients.findById(id)
    expect(found?.birth_year).toBe(1975)
    expect(found?.personality_type).toBe(5)

    await patients.update(id, { education_level: 2 })
    expect((await patients.findById(id))?.education_level).toBe(2)

    expect((await patients.list()).some((p) => p.id === id)).toBe(true)

    const page = await patients.listPage({ limit: 10, offset: 0 })
    expect(page.some((p) => p.id === id)).toBe(true)
    const byQ = await patients.listPage({ q: String(id), limit: 10, offset: 0 })
    expect(byQ).toHaveLength(1)
    expect(await patients.count()).toBeGreaterThanOrEqual(1)

    await cleanupPatient(db, id)
    expect(await patients.findById(id)).toBeNull()
  })
})
