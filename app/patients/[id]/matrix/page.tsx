import { redirect } from 'next/navigation'
import { requireUser, Header } from '@/features/auth'
import { canWrite } from '@/shared/api/session-repo'
import { getDb } from '@/shared/api/db'
import { getLocale } from '@/shared/lib/intl'
import { createPatientRepository, patientScopeFor } from '@/entities/patient'
import { createPhaseRepository, isSystemPhaseRelativeId, phaseColumnTitle } from '@/entities/phase'
import type { MatrixColumn, MatrixData, FieldValue } from '@/widgets/matrix'
import MatrixClient from './matrix-client'

/**
 * Матрица пациента (docs/spec-stage-2.md §4): серверная загрузка фаз из D1,
 * маппинг PhaseRow[] → MatrixData + токены версий CAS, isReadOnly по роли.
 */
const SKIP_COLUMNS = new Set(['id', 'patient_id', 'updated_at'])

export default async function PatientMatrixPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  const { id } = await params
  const patientId = Number(id)
  if (!Number.isInteger(patientId)) redirect('/patients')

  const db = await getDb()
  const locale = await getLocale()
  const patient = await createPatientRepository(db, patientScopeFor(user)).findById(patientId)
  if (!patient) redirect('/patients')
  const phaseRepo = createPhaseRepository(db)
  let phases = await phaseRepo.listByPatient(patientId)
  // Обратная совместимость: NULL-значения у старых фаз заполняются
  // последовательно (см. backfillMissingRelativeIds), UI видит колонки
  // в порядке 1, 2, …, 98, 99.
  if (phases.some((p) => p.phase_relative_id === null)) {
    await phaseRepo.backfillMissingRelativeIds(patientId)
    phases = await phaseRepo.listByPatient(patientId)
  }

  const columns: MatrixColumn[] = phases.map((p, i) => {
    const relId = p.phase_relative_id
    const isSystemPhase = isSystemPhaseRelativeId(relId)
    return {
      id: String(p.id),
      title: phaseColumnTitle(relId, locale === 'en' ? 'en' : 'ru'),
      order: i,
      relativeId: relId ?? undefined,
      isSystemPhase,
      // is_current_only-поля (шкалы HAM-D/Бек/часы/MMSE) доступны только
      // в колонках Поступление/Выписка (см. scales.ts и disabledFor в гриде).
      isCurrentStatus: isSystemPhase,
    }
  })

  const data: MatrixData = {}
  const versions: Record<string, string | null> = {}
  for (const p of phases) {
    const row: Record<string, FieldValue> = {}
    for (const [k, v] of Object.entries(p)) {
      if (!SKIP_COLUMNS.has(k)) row[k] = (v ?? null) as FieldValue
    }
    data[String(p.id)] = row
    versions[String(p.id)] = p.updated_at ?? null
  }

  return (
    <div className="flex h-[100dvh] flex-col pb-10">
      <Header displayName={user.displayName} role={user.role} />
      <div className="h-[100px] grow overflow-hidden">
        <MatrixClient
          patientId={patient.id}
          patientLabel={locale === 'en' ? `patient #${patient.id}` : `пациент #${patient.id}`}
          columns={columns}
          data={data}
          versions={versions}
          isReadOnly={!canWrite(user)}
          locale={locale}
        />
      </div>
    </div>
  )
}
