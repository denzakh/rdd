import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser, UserMenu } from '@/features/auth'
import { getDb } from '@/shared/api/db'
import { createPatientRepository, PatientCard } from '@/entities/patient'
import { createPhaseRepository } from '@/entities/phase'
import { canWrite } from '@/shared/api/session-repo'

/** Карточка пациента: паспортная часть + список фаз. */
export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  const { id } = await params
  const patientId = Number(id)
  if (!Number.isInteger(patientId)) notFound()

  const db = await getDb()
  const patient = await createPatientRepository(db).findById(patientId)
  if (!patient) notFound()
  const phases = await createPhaseRepository(db).listByPatient(patientId)

  return (
    <div>
      <UserMenu displayName={user.displayName} role={user.role} />
      <main className="mx-auto max-w-[1000px] space-y-4 p-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">Пациент #{patient.id}</h1>
          {canWrite(user) && (
            <Link
              href={`/patients/${patient.id}/edit`}
              className="text-xs text-blue-700 hover:underline"
            >
              изменить
            </Link>
          )}
        </div>

        <PatientCard patient={patient} />

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Фазы ({phases.length})</h2>
            <Link
              href={`/patients/${patient.id}/matrix`}
              className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs text-white hover:bg-neutral-700"
            >
              Матрица →
            </Link>
          </div>
          {phases.length === 0 ? (
            <p className="text-sm text-neutral-500">Фаз пока нет — создайте их в матрице.</p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
                  <th className="px-2 py-1.5">№</th>
                  <th className="px-2 py-1.5">Начало</th>
                  <th className="px-2 py-1.5">Длительность (мес)</th>
                  <th className="px-2 py-1.5">HAM-D</th>
                  <th className="px-2 py-1.5">Бек</th>
                </tr>
              </thead>
              <tbody>
                {phases.map((p) => (
                  <tr key={p.id} className="border-b border-neutral-100">
                    <td className="px-2 py-1.5">{p.phase_order_id}</td>
                    <td className="px-2 py-1.5">{p.phase_start_date ?? '—'}</td>
                    <td className="px-2 py-1.5">{p.phase_duration_months ?? '—'}</td>
                    <td className="px-2 py-1.5">{p.hamd_total ?? '—'}</td>
                    <td className="px-2 py-1.5">{p.beck_total ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  )
}
