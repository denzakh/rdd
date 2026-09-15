import { afterAll, describe, expect, it } from 'vitest'
import { createPatientRepository } from '@/entities/patient'
import { createAuditRepository } from '@/shared/api/audit-repo'
import { cleanupPatient, disposeTestDb, getTestDb } from '../helpers/db'

afterAll(disposeTestDb)

/** Очистка audit_log: триггеры append-only (0006) нужно временно снять. */
async function purgeAudit(db: D1Database, patientId: number): Promise<void> {
  await db.prepare('DROP TRIGGER IF EXISTS audit_no_update').run()
  await db.prepare('DROP TRIGGER IF EXISTS audit_no_delete').run()
  await db.prepare('DELETE FROM audit_log WHERE patient_id = ?').bind(patientId).run()
  await db
    .prepare(
      "CREATE TRIGGER audit_no_update BEFORE UPDATE ON audit_log BEGIN SELECT RAISE(ABORT, 'audit_log is append-only: UPDATE denied'); END"
    )
    .run()
  await db
    .prepare(
      "CREATE TRIGGER audit_no_delete BEFORE DELETE ON audit_log BEGIN SELECT RAISE(ABORT, 'audit_log is append-only: DELETE denied'); END"
    )
    .run()
}

describe('audit-repo (интеграция, локальная D1)', () => {
  it('insertStatements батчем + выборки listByPhase/listByPatient + hash-chain', async () => {
    const db = await getTestDb()
    const patients = createPatientRepository(db)
    const audit = createAuditRepository(db)

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
    const phase = await db
      .prepare(
        `INSERT INTO phases (patient_id, phase_order_id, phase_relative_id) VALUES (?, 1, 1)`
      )
      .bind(patientId)
      .run()
    const phaseId = Number(phase.meta.last_row_id)

    // батч из двух записей с actor_id и old/new value
    await db.batch(
      await audit.insertStatements([
        {
          actorId: 'user-1',
          patientId,
          phaseId,
          fieldId: 'hamd_total',
          action: 'update',
          oldValue: 18,
          newValue: 30,
          baseVersion: 'v1',
        },
        {
          actorId: 'user-2',
          patientId,
          phaseId,
          fieldId: 'hamd_total',
          action: 'conflict_resolved',
          resolution: 'theirs',
        },
      ])
    )

    const byPhase = await audit.listByPhase(phaseId)
    expect(byPhase).toHaveLength(2)
    expect(byPhase[0].actor_id).toBe('user-2') // ORDER BY ts DESC

    const byPatient = await audit.listByPatient(patientId)
    expect(byPatient).toHaveLength(2)

    const first = await audit.insert({ patientId, fieldId: 'patient', action: 'update' })
    void first
    const single = await audit.listByPatient(patientId)
    expect(single).toHaveLength(3)
    expect(single.some((r) => r.actor_id === null)).toBe(true) // actor_id nullable

    // hash-chain: записи связаны, verifyChain валидна (БД общая для всех тестов —
    // проверяем глобальную целостность, а не genesis конкретного пациента)
    const rows = await db
      .prepare('SELECT id, prev_hash, entry_hash FROM audit_log WHERE patient_id = ? ORDER BY id')
      .bind(patientId)
      .all<{ id: number; prev_hash: string | null; entry_hash: string }>()
    expect(rows.results.length).toBe(3)
    for (const row of rows.results) {
      expect(row.entry_hash).toMatch(/^[0-9a-f]{64}$/)
    }
    const verification = await audit.verifyChain()
    expect(verification.valid).toBe(true)

    // append-only на уровне БД: триггеры (0006) отменяют UPDATE и DELETE
    await expect(
      db
        .prepare('UPDATE audit_log SET new_value = ? WHERE id = ?')
        .bind('hacked', rows.results[0].id)
        .run()
    ).rejects.toThrow(/append-only/)
    await expect(
      db.prepare('DELETE FROM audit_log WHERE id = ?').bind(rows.results[0].id).run()
    ).rejects.toThrow(/append-only/)

    await purgeAudit(db, patientId)
    await db.prepare('DELETE FROM phases WHERE id = ?').bind(phaseId).run()
    await cleanupPatient(db, patientId)
  })
})
