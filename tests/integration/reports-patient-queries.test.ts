import { afterAll, describe, expect, it } from 'vitest'
import {
  averageAgeAtInclusion,
  createPatientRepository,
  familyHistoryDistribution,
  genderDistribution,
  patientScopeFor,
} from '@/entities/patient'
import type { SessionUser } from '@/shared/api/session-repo'
import { cleanupPatient, disposeTestDb, getTestDb } from '../helpers/db'

/**
 * Агрегаты /reports по пациентам (gender / семейная отягощённость / средний
 * возраст). Уважают data_scope пользователя (row-level access) и правило
 * согласия (consent_withdrawn_at IS NOT NULL → пациент исключён).
 */
afterAll(disposeTestDb)

const mkUser = (dataScope: 'all' | 'site', siteId: string | null = null): SessionUser => ({
  id: 'u-test',
  email: 't@test.local',
  displayName: 'T',
  role: 'admin',
  dataScope,
  siteId,
  mustChangePassword: false,
})

const countOf = (rows: Array<{ value: number; count: number }>, value: number): number =>
  rows.find((r) => r.value === value)?.count ?? 0

/** Полный паспортный набор полей, требуемый create() (PatientRow без id). */
const basePatient = {
  study_entry_date: '2025-01-10',
  birth_year: 1980,
  gender: 1,
  education_level: 2,
  career_level: 2,
  living_status: 1,
  disability_status: 0,
  family_history: 0,
  personality_type: 3,
}

describe('агрегаты /reports по пациентам', () => {
  it('распределения + средний возраст + data_scope', async () => {
    const db = await getTestDb()
    const allPatients = createPatientRepository(db)

    const idA1 = await allPatients.create({
      ...basePatient,
      birth_year: 1980,
      gender: 1,
      family_history: 1,
      site_id: 'site-a',
    })
    const idA2 = await allPatients.create({
      ...basePatient,
      birth_year: 1990,
      gender: 1,
      family_history: 0,
      site_id: 'site-a',
    })
    const idB = await allPatients.create({
      ...basePatient,
      study_entry_date: '2010-01-01',
      birth_year: 2000,
      gender: 2,
      family_history: 1,
      site_id: 'site-b',
    })

    try {
      const allScope = patientScopeFor(mkUser('all'))
      expect(countOf(await genderDistribution(db, allScope), 1)).toBe(2)
      expect(countOf(await genderDistribution(db, allScope), 2)).toBe(1)
      expect(countOf(await familyHistoryDistribution(db, allScope), 0)).toBe(1)
      expect(countOf(await familyHistoryDistribution(db, allScope), 1)).toBe(2)

      // (2025−1980=45, 2025−1990=35, 2010−2000=10) → 90 / 3 = 30
      const age = await averageAgeAtInclusion(db, allScope)
      expect(age.value).toBeCloseTo(30, 6)
      expect(age.patients).toBe(3)
      // выборочное СКО: значения [45, 35, 10] → s = √325 ≈ 18.0278
      expect(age.stddev).toBeCloseTo(Math.sqrt(325), 6)

      // data_scope 'site-a' — только свой центр
      const siteA = patientScopeFor(mkUser('site', 'site-a'))
      expect(countOf(await genderDistribution(db, siteA), 1)).toBe(2)
      expect(countOf(await genderDistribution(db, siteA), 2)).toBe(0)
      expect(countOf(await familyHistoryDistribution(db, siteA), 1)).toBe(1)
      const ageA = await averageAgeAtInclusion(db, siteA)
      expect(ageA.value).toBeCloseTo(40, 6)
      expect(ageA.patients).toBe(2)
      // выборочное СКО: значения [45, 35] → s = √50 ≈ 7.0711
      expect(ageA.stddev).toBeCloseTo(Math.sqrt(50), 6)

      // 'site' без привязки к центру — fail closed, пусто
      const noBinding = patientScopeFor(mkUser('site', null))
      expect(await genderDistribution(db, noBinding)).toEqual([])
      expect(await familyHistoryDistribution(db, noBinding)).toEqual([])
      expect((await averageAgeAtInclusion(db, noBinding)).patients).toBe(0)
      expect((await averageAgeAtInclusion(db, noBinding)).value).toBeNull()
      expect((await averageAgeAtInclusion(db, noBinding)).stddev).toBeNull()
    } finally {
      for (const id of [idA1, idA2, idB]) await cleanupPatient(db, id)
    }
  })
})
