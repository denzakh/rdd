import { afterAll, describe, expect, it } from 'vitest'
import { createPatientRepository, PATIENT_SCOPE_ALL } from '@/entities/patient'
import { countByField, efficacyByMainComponent, phaseDurationsByOrder } from '@/entities/phase'
import type { DeidentifiedScope } from '@/entities/phase'
import { cleanupPatient, disposeTestDb, getTestDb } from '../helpers/db'

/**
 * docs/ru/export.md §3: агрегаты /reports (countByField / phaseDurationsByOrder /
 * efficacyByMainComponent) уважают data_scope пользователя — тот же row-level
 * access, что и у списков пациентов.
 */
afterAll(disposeTestDb)

const patient = (siteId: string | null) => ({
  study_entry_date: '2025-01-10',
  birth_year: 1980,
  gender: 1,
  education_level: 2,
  career_level: 2,
  living_status: 1,
  disability_status: 0,
  family_history: 0,
  personality_type: 3,
  site_id: siteId,
})

async function addPhase(db: D1Database, patientId: number, mainComponent: number): Promise<void> {
  await db
    .prepare(
      `INSERT INTO phases (patient_id, phase_order_id, phase_relative_id, phase_duration_months,
         intermission_duration, main_component, ad_efficacy)
       VALUES (?, 1, 1, 6.0, 3.0, ?, 2)`
    )
    .bind(patientId, mainComponent)
    .run()
}

const countOf = (rows: Array<{ value: number; count: number }>, v: number): number =>
  rows.find((r) => r.value === v)?.count ?? 0

describe('агрегаты /reports: data_scope (docs/ru/export.md §3)', () => {
  it('data_scope фильтрует агрегаты: all / site / fail-closed для site без центра', async () => {
    const db = await getTestDb()
    const admin = createPatientRepository(db, PATIENT_SCOPE_ALL)

    const idA1 = await admin.create(patient('site-a'))
    await addPhase(db, idA1, 1)
    const idA2 = await admin.create(patient('site-a'))
    await addPhase(db, idA2, 1)
    const idB = await admin.create(patient('site-b'))
    await addPhase(db, idB, 2)

    const all: DeidentifiedScope = { mode: 'all' }
    const siteA: DeidentifiedScope = { mode: 'site', siteId: 'site-a' }
    const noBinding: DeidentifiedScope = { mode: 'site', siteId: null }

    try {
      // 'all' — видит оба центра
      expect(countOf(await countByField(db, 'main_component', all), 1)).toBe(2)
      expect(countOf(await countByField(db, 'main_component', all), 2)).toBe(1)

      // 'site' (центр A) — только свой центр: внешний компонент 2 не виден
      const rowsA = await countByField(db, 'main_component', siteA)
      expect(countOf(rowsA, 1)).toBe(2)
      expect(countOf(rowsA, 2)).toBe(0)

      // 'site' без привязки к центру — fail closed, пусто (как в patient-repo)
      expect(await countByField(db, 'main_component', noBinding)).toEqual([])

      // phaseDurationsByOrder / efficacy также фильтруются по scope
      const dAll = await phaseDurationsByOrder(db, all)
      const dA = await phaseDurationsByOrder(db, siteA)
      expect(dAll.find((r) => r.phase_order_id === 1)?.patients).toBe(3)
      expect(dA.find((r) => r.phase_order_id === 1)?.patients).toBe(2)

      const eA = await efficacyByMainComponent(db, siteA)
      expect(eA.find((r) => r.main_component === 1)?.count).toBe(2)
      expect(eA.find((r) => r.main_component === 2)).toBeUndefined()
    } finally {
      for (const id of [idA1, idA2, idB]) await cleanupPatient(db, id)
    }
  })
})
