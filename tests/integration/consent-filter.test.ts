import { afterAll, describe, expect, it } from 'vitest'
import { createPatientRepository } from '@/entities/patient'
import { countByField, efficacyByMainComponent, phaseDurationsByOrder } from '@/entities/phase'
import { cleanupPatient, disposeTestDb, getTestDb } from '../helpers/db'
/**
 * Правило согласия (consent lifecycle): фазы пациента, отозвавшего согласие
 * (patients.consent_withdrawn_at IS NOT NULL), не участвуют в агрегатах
 * отчётов (src/entities/phase/api/queries.ts). Данные не удаляются физически.
 */
afterAll(disposeTestDb)

const patientInput = {
  study_entry_date: '2024-01-01',
  birth_year: 1980,
  gender: 1,
  education_level: 2,
  career_level: 2,
  living_status: 1,
  disability_status: 0,
  family_history: 0,
  personality_type: 3,
}

const countOf = (rows: Array<{ value: number; count: number }>, value: number): number =>
  rows.find((r) => r.value === value)?.count ?? 0

describe('consent: данные с отозванным согласием исключаются из отчётов', () => {
  it('countByField / phaseDurationsByOrder / efficacyByMainComponent', async () => {
    const db = await getTestDb()
    const patients = createPatientRepository(db)

    const patientId = await patients.create(patientInput)
    await db
      .prepare(
        `INSERT INTO phases (patient_id, phase_order_id, phase_duration_months,
           intermission_duration, main_component, ad_efficacy)
         VALUES (?, 1, 6.0, 3.0, 1, 2)`
      )
      .bind(patientId)
      .run()

    // до отзыва согласия — пациент участвует во всех агрегатах
    // k=1: порог подавления не скрывает малую группу (тест про consent, не про k-anonymity).
    expect(
      countOf(await countByField(db, 'main_component', { mode: 'all' }, 1), 1)
    ).toBeGreaterThan(0)
    expect(
      (await phaseDurationsByOrder(db, { mode: 'all' }, 1)).some((r) => r.phase_order_id === 1)
    ).toBe(true)
    expect(
      (await efficacyByMainComponent(db, { mode: 'all' }, 1)).some(
        (r) => r.main_component === 1 && r.ad_efficacy === 2
      )
    ).toBe(true)

    // отзыв согласия (данные остаются в БД)
    await db
      .prepare(
        'UPDATE patients SET consent_version = ?, consent_date = ?, consent_withdrawn_at = ? WHERE id = ?'
      )
      .bind('v1', '2024-01-05', '2024-06-01', patientId)
      .run()
    const row = await db.prepare('SELECT * FROM patients WHERE id = ?').bind(patientId).first()
    expect(row).toBeTruthy()

    // после отзыва — пациент исключён из отчётов
    expect(countOf(await countByField(db, 'main_component', { mode: 'all' }, 1), 1)).toBe(0)
    expect(
      (await phaseDurationsByOrder(db, { mode: 'all' }, 1)).some((r) => r.phase_order_id === 1)
    ).toBe(false)
    expect(
      (await efficacyByMainComponent(db, { mode: 'all' }, 1)).some(
        (r) => r.main_component === 1 && r.ad_efficacy === 2
      )
    ).toBe(false)

    await cleanupPatient(db, patientId)
  })

  it('patient-repo: signConsent / withdrawConsent (идемпотентность, восстановление)', async () => {
    const db = await getTestDb()
    const patients = createPatientRepository(db)
    const patientId = await patients.create(patientInput)

    // подписание: версия/дата фиксируются
    expect(await patients.signConsent(patientId, { version: 'v1', date: '2024-02-01' })).toBe(true)
    const signed = await patients.findById(patientId)
    expect(signed?.consent_version).toBe('v1')
    expect(signed?.consent_date).toBe('2024-02-01')
    expect(signed?.consent_withdrawn_at).toBeNull()

    // отзыв: время фиксируется, повторный отзыв — no-op
    expect(await patients.withdrawConsent(patientId)).toBe(true)
    const firstWithdrawnAt = (await patients.findById(patientId))?.consent_withdrawn_at
    expect(firstWithdrawnAt).toBeTruthy()
    expect(await patients.withdrawConsent(patientId)).toBe(false)
    expect((await patients.findById(patientId))?.consent_withdrawn_at).toBe(firstWithdrawnAt)

    // повторное подписание снимает отзыв (данные снова в отчётах)
    expect(await patients.signConsent(patientId)).toBe(true)
    const restored = await patients.findById(patientId)
    expect(restored?.consent_withdrawn_at).toBeNull()
    expect(restored?.consent_version).toBe('v1')

    // несуществующий пациент
    expect(await patients.signConsent(999999)).toBe(false)
    expect(await patients.withdrawConsent(999999)).toBe(false)

    await cleanupPatient(db, patientId)
  })
})
