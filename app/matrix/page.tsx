import { logoutAction, requireUser } from '@/features/auth'
import { canWrite } from '@/shared/api/session-repo'
import { getDb } from '@/shared/api/db'
import { createPatientRepository } from '@/shared/api/patient-repo'
import { createPhaseRepository } from '@/shared/api/phase-repo'
import type { MatrixColumn, MatrixData, FieldValue } from '@/widgets/matrix'
import MatrixClient from './matrix-client'

/**
 * Серверная обёртка (docs/spec-stage-1.md §3): requireUser(), загрузка пациента
 * и его фаз из D1, маппинг PhaseRow[] → MatrixData + токены версий CAS.
 */
const SKIP_COLUMNS = new Set(['id', 'patient_id', 'updated_at'])

export default async function MatrixPage() {
  const user = await requireUser()
  const db = await getDb()
  const patients = await createPatientRepository(db).list()
  const patient = patients[0] ?? null

  if (!patient) {
    return (
      <div>
        <UserMenu displayName={user.displayName} role={user.role} />
        <main className="mx-auto max-w-[1400px] p-6">
          <h1 className="text-xl font-semibold">Матрица клинических признаков</h1>
          <p className="mt-4 text-sm text-neutral-600">
            В базе нет ни одного пациента. Создайте пациента (страница списка появится в этапе 2 —
            docs/spec-stage-2.md) либо скриптом seed.
          </p>
        </main>
      </div>
    )
  }

  const phases = await createPhaseRepository(db).listByPatient(patient.id)

  const columns: MatrixColumn[] = phases.map((p, i) => ({
    id: String(p.id),
    title: `Фаза ${p.phase_order_id}`,
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
      <UserMenu displayName={user.displayName} role={user.role} />
      <MatrixClient
        patientId={patient.id}
        patientLabel={`пациент #${patient.id}`}
        columns={columns}
        data={data}
        versions={versions}
        isReadOnly={!canWrite(user)}
      />
    </div>
  )
}

function UserMenu({ displayName, role }: { displayName: string; role: string }) {
  return (
    <div className="flex items-center justify-end gap-3 border-b border-neutral-200 px-6 py-2 text-sm">
      <span className="text-neutral-600">
        {displayName} · <span className="text-neutral-400">{role}</span>
      </span>
      <form action={logoutAction}>
        <button
          type="submit"
          className="rounded-md border border-neutral-300 px-3 py-1 text-xs hover:bg-neutral-100"
        >
          Выйти
        </button>
      </form>
    </div>
  )
}
