'use server'

/**
 * Server Actions матрицы (docs/spec-stage-1.md).
 * Авторизация: requireUser() + canWrite() в каждом действии.
 * Валидация: whitelist DATA_COLUMNS + Zod по полю реестра (to-zod).
 * Конкурентность: CAS через phase-repo.updateWithVersion, аудит — в том же db.batch.
 */
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/features/auth/session'
import { canWrite } from '@/shared/api/session-repo'
import { getDb } from '@/shared/api/db'
import { createAuditRepository } from '@/shared/api/audit-repo'
import { createPatientRepository } from '@/shared/api/patient-repo'
import { DATA_COLUMNS, createPhaseRepository } from '@/shared/api/phase-repo'
import type { PhaseRow } from '@/shared/api/rows'
import { phaseSchema } from '@/shared/lib/registry/to-zod'
import type { FieldValue } from '@/widgets/matrix'

export interface CellInput {
  fieldId: string
  value: FieldValue
}

export type SavePhaseCellsResult =
  | { ok: true; applied: true; row: PhaseRow }
  | { ok: true; applied: false; row: PhaseRow | null } // конфликт 409: row = актуальная строка сервера
  | { ok: false; error: string; invalidFields?: string[] }

const DATA_COLUMN_SET = new Set<string>(DATA_COLUMNS)

/** Пакетное сохранение dirty-ячеек одной фазы (выход subscribeDirty). */
export async function savePhaseCells(
  patientId: number,
  phaseId: number,
  cells: CellInput[],
  baseVersion: string | null
): Promise<SavePhaseCellsResult> {
  const user = await requireUser()
  if (!canWrite(user)) return { ok: false, error: 'Доступ только для чтения' }

  // --- whitelist колонок + Zod-валидация каждой ячейки (§2.2 спеки) ---
  const invalidFields: string[] = []
  const patch: Record<string, unknown> = {}
  for (const { fieldId, value } of cells) {
    if (!DATA_COLUMN_SET.has(fieldId)) {
      return { ok: false, error: `Неизвестное поле: ${fieldId}` }
    }
    if (value === null) {
      patch[fieldId] = null
      continue
    }
    const validator = phaseSchema.shape[fieldId]
    if (validator && !validator.safeParse(value).success) {
      invalidFields.push(fieldId)
      continue
    }
    patch[fieldId] = value
  }
  if (invalidFields.length > 0) {
    return { ok: false, error: 'Некорректные значения', invalidFields }
  }

  const db = await getDb()
  const repo = createPhaseRepository(db)
  const existing = await repo.findById(phaseId)
  if (!existing || existing.patient_id !== patientId) {
    return { ok: false, error: 'Фаза не найдена' }
  }

  const res = await repo.updateWithVersion(phaseId, patch, baseVersion ?? '', user.id)
  if (res.applied && res.row) return { ok: true, applied: true, row: res.row }
  return { ok: true, applied: false, row: res.row }
}

/** Создание новой фазы пациента (+ аудита phase_created). */
export async function createPhase(
  patientId: number
): Promise<{ ok: true; phaseId: number } | { ok: false; error: string }> {
  const user = await requireUser()
  if (!canWrite(user)) return { ok: false, error: 'Доступ только для чтения' }

  const db = await getDb()
  const patientRepo = createPatientRepository(db)
  const patient = await patientRepo.findById(patientId)
  if (!patient) return { ok: false, error: 'Пациент не найден' }

  const repo = createPhaseRepository(db)
  const phaseId = await repo.create({ patient_id: patientId })
  // Аудит уровня строки; атомарность с INSERT не критична (insert идемпотентно повторяем)
  await createAuditRepository(db).insert({
    actorId: user.id,
    patientId,
    phaseId,
    fieldId: 'phase',
    action: 'phase_created',
  })
  revalidatePath('/matrix')
  return { ok: true, phaseId }
}

/** Удаление фазы (+ аудита phase_deleted со снимком строки). */
export async function deletePhase(
  patientId: number,
  phaseId: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser()
  if (!canWrite(user)) return { ok: false, error: 'Доступ только для чтения' }

  const db = await getDb()
  const repo = createPhaseRepository(db)
  const existing = await repo.findById(phaseId)
  if (!existing || existing.patient_id !== patientId) {
    return { ok: false, error: 'Фаза не найдена' }
  }

  await repo.remove(phaseId)
  await createAuditRepository(db).insert({
    actorId: user.id,
    patientId,
    phaseId,
    fieldId: 'phase',
    action: 'phase_deleted',
    oldValue: existing,
  })
  revalidatePath('/matrix')
  return { ok: true }
}
