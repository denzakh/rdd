import { afterAll, describe, expect, it } from 'vitest'
import { createPatientRepository } from '@/entities/patient'
import { createPhaseRepository, type PhaseInput } from '@/entities/phase'
import { cleanupPatient, disposeTestDb, getTestDb } from '../helpers/db'

const phaseInput = (patientId: number, patch: Partial<PhaseInput> = {}): PhaseInput => ({
  patient_id: patientId,
  phase_start_date: '2024-03-01',
  phase_duration_months: 6.0,
  hamd_total: 18,
  ...patch,
})

afterAll(disposeTestDb)

describe('phase-repo (интеграция, локальная D1)', () => {
  it('create назначает следующее phase_order_id', async () => {
    const db = await getTestDb()
    const patients = createPatientRepository(db)
    const phases = createPhaseRepository(db)

    const patientId = await patients.create({
      study_entry_date: '2024-01-01',
      birth_year: 1980,
      gender: 1,
      education_level: 2,
      career_level: 2,
      living_status: 1,
      disability_status: 0,
      family_history: 0,
      personality_type: 3,
    })

    const p1 = await phases.findById(await phases.create(phaseInput(patientId)))
    expect(p1?.phase_order_id).toBe(1)
    const p2 = await phases.findById(await phases.create(phaseInput(patientId, { hamd_total: 25 })))
    expect(p2?.phase_order_id).toBe(2)

    expect((await phases.listByPatient(patientId)).length).toBe(2)

    // после удаления первой фазы следующая создаётся как max+1 = 3
    await phases.remove(p1!.id)
    const p3 = await phases.findById(await phases.create(phaseInput(patientId)))
    expect(p3?.phase_order_id).toBe(3)

    await cleanupPatient(db, patientId)
  })

  it('update изменяет колонки', async () => {
    const db = await getTestDb()
    const patients = createPatientRepository(db)
    const phases = createPhaseRepository(db)
    const patientId = await patients.create({
      study_entry_date: '2024-01-01',
      birth_year: 1980,
      gender: 1,
      education_level: 2,
      career_level: 2,
      living_status: 1,
      disability_status: 0,
      family_history: 0,
      personality_type: 3,
    })
    const id = await phases.create(phaseInput(patientId))

    await phases.update(id, { hamd_total: 20, beck_total: 21 })
    const row = await phases.findById(id)
    expect(row?.hamd_total).toBe(20)
    expect(row?.beck_total).toBe(21)

    await cleanupPatient(db, patientId)
  })

  it('updateWithVersion: applied при верном baseVersion, конфликт при устаревшем', async () => {
    const db = await getTestDb()
    const patients = createPatientRepository(db)
    const phases = createPhaseRepository(db)
    const patientId = await patients.create({
      study_entry_date: '2024-01-01',
      birth_year: 1980,
      gender: 1,
      education_level: 2,
      career_level: 2,
      living_status: 1,
      disability_status: 0,
      family_history: 0,
      personality_type: 3,
    })
    const id = await phases.create(phaseInput(patientId))

    const row = (await phases.findById(id))!
    expect(row.updated_at).toBeTruthy()

    // applied
    const ok = await phases.updateWithVersion(id, { hamd_total: 30 }, row.updated_at!)
    expect(ok.applied).toBe(true)
    expect(ok.row?.hamd_total).toBe(30)

    // конфликт: старый токен уже невалиден
    const conflict = await phases.updateWithVersion(id, { hamd_total: 99 }, row.updated_at!)
    expect(conflict.applied).toBe(false)
    expect(conflict.row?.hamd_total).toBe(30) // актуальная строка, не наша правка

    // аудит записан (update при applied)
    const audit = await db
      .prepare('SELECT COUNT(*) AS n FROM audit_log WHERE phase_id = ?')
      .bind(id)
      .first<{ n: number }>()
    expect(audit?.n).toBeGreaterThan(0)

    await cleanupPatient(db, patientId)
  })
})
