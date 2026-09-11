import { redirect } from 'next/navigation'
import { requireUser, Header } from '@/features/auth'
import { canWrite } from '@/shared/api/session-repo'
import { getDb } from '@/shared/api/db'
import { getLocale } from '@/shared/lib/intl'
import { createPatientRepository, patientScopeFor } from '@/entities/patient'
import { createPhaseRepository } from '@/entities/phase'
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
  const phases = await createPhaseRepository(db).listByPatient(patientId)

  const columns: MatrixColumn[] = phases.map((p, i) => ({
    id: String(p.id),
    title: locale === 'en' ? `Phase ${p.phase_order_id}` : `Фаза ${p.phase_order_id}`,
    order: i,
  }))

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
    <div>
      <Header displayName={user.displayName} role={user.role} />
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
  )
}
