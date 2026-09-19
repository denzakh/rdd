import { afterAll, describe, expect, it } from 'vitest'
import { createPatientRepository } from '@/entities/patient'
import {
  BINARY_PHASE_COLUMNS,
  PHASE_RELATIVE_ADMISSION,
  binaryFeatureDistributions,
} from '@/entities/phase'
import type { DeidentifiedScope } from '@/entities/phase'
import { cleanupPatient, disposeTestDb, getTestDb } from '../helpers/db'

/**
 * binaryFeatureDistributions: все бинарные (0/1) признаки фаз одним запросом
 * с условной агрегацией. Инварианты, общие с остальными агрегатами /reports:
 * служебные фазы 98/99 исключены, пациент с отозванным согласием исключён,
 * data_scope уважается. Семантика count — ФАЗЫ (эпизоды).
 */
afterAll(disposeTestDb)

/** Паспортные поля, обязательные для create() (PatientRow без id/version). */
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

describe('binaryFeatureDistributions: бинарные признаки фаз', () => {
  it('BINARY_PHASE_COLUMNS: без вычисляемых полей, patient-scope и не-колонок phases', () => {
    expect(BINARY_PHASE_COLUMNS).toContain('melancholy_obj') // статус
    expect(BINARY_PHASE_COLUMNS).toContain('subdepression_const') // ремиссия
    expect(BINARY_PHASE_COLUMNS).toContain('ad_switch') // терапия
    expect(BINARY_PHASE_COLUMNS).not.toContain('pure_remission') // calculate — не колонка
    expect(BINARY_PHASE_COLUMNS).not.toContain('family_history') // scope patient
  })

  it('да/знаменатель по фазам: 98/99 и согласие исключены, scope фильтрует', async () => {
    const db = await getTestDb()
    const admin = createPatientRepository(db)

    // Локальная D1 — общее состояние dev-окружения с произвольными данными,
    // поэтому проверяем ДЕЛЬТЫ до/после посева, а не абсолютные значения.
    // Гигиена: сироты (фазы без patients) и остатки прежних прогонов этого
    // файла по его уникальным центрам.
    const SITES = ['site-binary-a', 'site-binary-b']
    await db.prepare('DELETE FROM phases WHERE patient_id NOT IN (SELECT id FROM patients)').run()
    await db
      .prepare(
        `DELETE FROM phases WHERE patient_id IN (
           SELECT id FROM patients WHERE site_id IN ('site-binary-a', 'site-binary-b')
         )`
      )
      .run()
    await db
      .prepare("DELETE FROM patients WHERE site_id IN ('site-binary-a', 'site-binary-b')")
      .run()

    const all: DeidentifiedScope = { mode: 'all' }
    const siteA: DeidentifiedScope = { mode: 'site', siteId: SITES[0] }
    const noBinding: DeidentifiedScope = { mode: 'site', siteId: null }

    const beforeAll = await binaryFeatureDistributions(db, all)
    const beforeSiteA = await binaryFeatureDistributions(db, siteA)

    const idA = await admin.create({ ...basePatient, site_id: SITES[0] })
    const idB = await admin.create({ ...basePatient, site_id: SITES[1] })
    const idC = await admin.create({ ...basePatient, site_id: SITES[0] })

    const addPhase = async (
      db: D1Database,
      patientId: number,
      orderId: number,
      relativeId: number,
      melancholy: number | null
    ): Promise<void> => {
      await db
        .prepare(
          `INSERT INTO phases (patient_id, phase_order_id, phase_relative_id, melancholy_obj)
           VALUES (?, ?, ?, ?)`
        )
        .bind(patientId, orderId, relativeId, melancholy)
        .run()
    }

    /** Дельта счётчиков признака fieldId между двумя выборками. */
    const delta = (
      after: Array<{ fieldId: string; yes: number; total: number }>,
      before: Array<{ fieldId: string; yes: number; total: number }>,
      fieldId: string
    ): { yes: number; total: number } => {
      const a = after.find((r) => r.fieldId === fieldId)
      const b = before.find((r) => r.fieldId === fieldId)
      return { yes: (a?.yes ?? 0) - (b?.yes ?? 0), total: (a?.total ?? 0) - (b?.total ?? 0) }
    }

    try {
      // Обычная фаза с признаком + служебная 98 с признаком (должна исключаться).
      await addPhase(db, idA, 1, 1, 1)
      await addPhase(db, idA, 2, PHASE_RELATIVE_ADMISSION, 1)
      // Заполненный 0 увеличивает знаменатель, но не «да».
      await addPhase(db, idB, 1, 1, 0)
      // Пациент с отозванным согласием — вне статистики.
      await addPhase(db, idC, 1, 1, 1)
      await db
        .prepare('UPDATE patients SET consent_withdrawn_at = ? WHERE id = ?')
        .bind('2026-01-01 00:00:00', idC)
        .run()

      const afterAll = await binaryFeatureDistributions(db, all)
      expect(afterAll).toHaveLength(beforeAll.length)
      // +1 «да» (idA) и +2 знаменатель (idA + idB с заполненным 0);
      // служебная 98 (melancholy_obj=1) и idC (отозванное согласие) исключены.
      expect(delta(afterAll, beforeAll, 'melancholy_obj')).toEqual({ yes: 1, total: 2 })

      const afterSiteA = await binaryFeatureDistributions(db, siteA)
      // Только idA; idB — другой центр, 98 и idC исключены.
      expect(delta(afterSiteA, beforeSiteA, 'melancholy_obj')).toEqual({ yes: 1, total: 1 })

      // Fail closed: site без привязки к центру — пустые счётчики.
      const none = await binaryFeatureDistributions(db, noBinding)
      expect(none.find((r) => r.fieldId === 'melancholy_obj')).toEqual({
        fieldId: 'melancholy_obj',
        yes: 0,
        total: 0,
      })
    } finally {
      for (const id of [idA, idB, idC]) await cleanupPatient(db, id)
    }
  })
})
