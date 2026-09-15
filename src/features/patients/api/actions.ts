'use server'

/**
 * Server Actions пациентов (docs/spec-stage-2.md §4).
 * Валидация — Zod по пациентским полям реестра; право записи — canWrite.
 */
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/shared/api'
import { canWrite } from '@/shared/api'
import { getDb } from '@/shared/api'
import { FLAT_REGISTRY } from '@/shared/config'
import type { RegistryField } from '@/shared/config'
import { z } from 'zod'
import { createAuditRepository } from '@/shared/api'
import { createPatientRepository, patientScopeFor, type PatientInput } from '@/entities/patient'
import { createPhaseRepository, DEFAULT_PHASE_RELATIVE_IDS } from '@/entities/phase'

/** Zod-схема паспортной части, сгенерированная по полям реестра. */
const patientShape: Record<string, z.ZodTypeAny> = {}
for (const field of Object.values(FLAT_REGISTRY)) {
  const f = field as RegistryField
  if (f.scope !== 'patient') continue
  let validator: z.ZodTypeAny
  switch (f.db_type) {
    case 'INTEGER': {
      let n = z.number()
      if (f.min !== undefined) n = n.min(f.min)
      if (f.max !== undefined) n = n.max(f.max)
      validator = n
      break
    }
    case 'BOOLEAN':
      validator = z.coerce.boolean().transform((v) => (v ? 1 : 0))
      break
    case 'DATE':
      validator = z.string()
      break
    default:
      validator = z.any()
  }
  patientShape[f.id] = validator.nullable()
}
const patientSchema = z.object(patientShape)

/** Парсинг FormData → PatientInput (пустые строки → NULL). */
function parsePatientForm(formData: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const field of Object.values(FLAT_REGISTRY)) {
    const f = field as RegistryField
    if (f.scope !== 'patient') continue
    const raw = formData.get(f.id)
    if (raw === null || raw === '') {
      out[f.id] = null
    } else if (f.db_type === 'INTEGER' || f.db_type === 'BOOLEAN') {
      out[f.id] = Number(raw)
    } else {
      out[f.id] = String(raw)
    }
  }
  return out
}

export type PatientActionState = { error?: string; fieldErrors?: string[] }

export async function savePatientAction(
  _prev: PatientActionState,
  formData: FormData
): Promise<PatientActionState> {
  const user = await requireUser()
  if (!canWrite(user)) return { error: 'Доступ только для чтения' }

  const idRaw = formData.get('id')
  const id = idRaw ? Number(idRaw) : null
  const parsed = patientSchema.safeParse(parsePatientForm(formData))
  if (!parsed.success) {
    return {
      error: 'Проверьте выделенные поля',
      fieldErrors: parsed.error.issues.map((i) => String(i.path[0])),
    }
  }
  const input = parsed.data as unknown as PatientInput

  const db = await getDb()
  const repo = createPatientRepository(db, patientScopeFor(user))
  if (id === null) {
    // Привязка "чья карта" (row-level access): карта наследует центр создателя
    // и назначается на него (admin со scope 'all' остаётся без привязки).
    const input = {
      ...(parsed.data as unknown as PatientInput),
      site_id: user.siteId,
      assigned_clinician_id: user.dataScope === 'all' ? null : user.id,
    }
    const newId = await repo.create(input)
    await createAuditRepository(db).insert({
      actorId: user.id,
      patientId: newId,
      fieldId: 'patient',
      action: 'update',
      newValue: input,
    })
    // Стартовые фазы нового пациента: 1, 2, 98 (Поступление), 99 (Выписка).
    // Пустые, по умолчанию открывают матрицу с 4 колонками.
    const phases = createPhaseRepository(db)
    for (const relativeId of DEFAULT_PHASE_RELATIVE_IDS) {
      const phaseId = await phases.create({ patient_id: newId, phase_relative_id: relativeId })
      await createAuditRepository(db).insert({
        actorId: user.id,
        patientId: newId,
        phaseId,
        fieldId: 'phase',
        action: 'phase_created',
      })
    }
    revalidatePath('/patients')
    redirect(`/patients/${newId}`)
  }
  const existing = await repo.findById(id)
  if (!existing) return { error: 'Пациент не найден' }
  await repo.update(id, input)
  await createAuditRepository(db).insert({
    actorId: user.id,
    patientId: id,
    fieldId: 'patient',
    action: 'update',
    oldValue: existing,
    newValue: input,
  })
  revalidatePath('/patients')
  revalidatePath(`/patients/${id}`)
  return {}
}

// --- Жизненный цикл согласия (consent lifecycle) ---
// Правило: пациент с consent_withdrawn_at != null исключается из отчётов/экспорта
// (см. src/entities/phase/api/queries.ts), данные физически не удаляются.

export async function signConsentAction(
  _prev: PatientActionState,
  formData: FormData
): Promise<PatientActionState> {
  const user = await requireUser()
  if (!canWrite(user)) return { error: 'Доступ только для чтения' }

  const id = Number(formData.get('id'))
  if (!Number.isInteger(id)) return { error: 'Некорректный id пациента' }

  const db = await getDb()
  const repo = createPatientRepository(db)
  const existing = await repo.findById(id)
  if (!existing) return { error: 'Пациент не найден' }

  await repo.signConsent(id)
  await createAuditRepository(db).insert({
    actorId: user.id,
    patientId: id,
    fieldId: 'consent',
    action: 'update',
    oldValue: { consent_withdrawn_at: existing.consent_withdrawn_at ?? null },
    newValue: { consent_withdrawn_at: null },
  })
  revalidatePath('/patients')
  revalidatePath(`/patients/${id}`)
  return {}
}

export async function withdrawConsentAction(
  _prev: PatientActionState,
  formData: FormData
): Promise<PatientActionState> {
  const user = await requireUser()
  if (!canWrite(user)) return { error: 'Доступ только для чтения' }

  const id = Number(formData.get('id'))
  if (!Number.isInteger(id)) return { error: 'Некорректный id пациента' }

  const db = await getDb()
  const repo = createPatientRepository(db)
  const existing = await repo.findById(id)
  if (!existing) return { error: 'Пациент не найден' }
  if (existing.consent_withdrawn_at) return {} // уже отозвано — идемпотентность

  await repo.withdrawConsent(id)
  await createAuditRepository(db).insert({
    actorId: user.id,
    patientId: id,
    fieldId: 'consent',
    action: 'update',
    oldValue: { consent_withdrawn_at: null },
    newValue: { consent_withdrawn_at: new Date().toISOString() },
  })
  revalidatePath('/patients')
  revalidatePath(`/patients/${id}`)
  return {}
}
