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
import { createPatientRepository, type PatientInput } from '@/entities/patient'

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
  const repo = createPatientRepository(db)
  if (id === null) {
    const newId = await repo.create(input)
    await createAuditRepository(db).insert({
      actorId: user.id,
      patientId: newId,
      fieldId: 'patient',
      action: 'update',
      newValue: input,
    })
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
