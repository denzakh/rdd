import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser, Header } from '@/features/auth'
import { getDb } from '@/shared/api/db'
import { getLocale } from '@/shared/lib/intl'
import { createPatientRepository, patientScopeFor, PatientCard } from '@/entities/patient'
import { createPhaseRepository } from '@/entities/phase'
import { ConsentPanel } from '@/features/patients'
import { canWrite } from '@/shared/api/session-repo'

/** Карточка пациента: паспортная часть + список фаз. */
export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  const { id } = await params
  const patientId = Number(id)
  if (!Number.isInteger(patientId)) notFound()

  const db = await getDb()
  const locale = await getLocale()
  const en = locale === 'en'
  const patient = await createPatientRepository(db, patientScopeFor(user)).findById(patientId)
  if (!patient) notFound()
  const phases = await createPhaseRepository(db).listByPatient(patientId)

  return (
    <div>
      <Header displayName={user.displayName} role={user.role} />
      <main className="mx-auto max-w-[1000px] space-y-4 p-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">
            {en ? 'Patient' : 'Пациент'} #{patient.id}
          </h1>
          {canWrite(user) && (
            <Link
              href={`/patients/${patient.id}/edit`}
              className="text-xs text-cyan-700 hover:opacity-80"
            >
              {en ? 'edit' : 'изменить'}
            </Link>
          )}
        </div>

        <PatientCard patient={patient} locale={locale} />

        <ConsentPanel
          patientId={patient.id}
          consent={{
            version: patient.consent_version ?? null,
            date: patient.consent_date ?? null,
            withdrawnAt: patient.consent_withdrawn_at ?? null,
          }}
          canWrite={canWrite(user)}
        />

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {en ? 'Phases' : 'Фазы'} ({phases.length})
            </h2>
            <Link
              href={`/patients/${patient.id}/matrix`}
              className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs text-white hover:bg-neutral-700"
            >
              {en ? 'Matrix →' : 'Матрица →'}
            </Link>
          </div>
          {phases.length === 0 ? (
            <p className="text-sm text-neutral-500">
              {en
                ? 'No phases yet — create them in the matrix.'
                : 'Фаз пока нет — создайте их в матрице.'}
            </p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
                  <th className="px-2 py-1.5">№</th>
                  <th className="px-2 py-1.5">{en ? 'Start' : 'Начало'}</th>
                  <th className="px-2 py-1.5">{en ? 'Duration (mo)' : 'Длительность (мес)'}</th>
                  <th className="px-2 py-1.5">HAM-D</th>
                  <th className="px-2 py-1.5">{en ? 'BDI' : 'Бек'}</th>
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
