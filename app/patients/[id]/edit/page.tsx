import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser, UserMenu } from '@/features/auth'
import { canWrite } from '@/shared/api/session-repo'
import { getDb } from '@/shared/api/db'
import { createPatientRepository } from '@/entities/patient'
import { PatientForm } from '@/features/patients'

/** Редактирование паспортной части пациента. */
export default async function EditPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  if (!canWrite(user)) {
    return (
      <div>
        <UserMenu displayName={user.displayName} role={user.role} />
        <main className="p-6 text-sm text-red-700">Доступ только для чтения.</main>
      </div>
    )
  }

  const { id } = await params
  const patientId = Number(id)
  if (!Number.isInteger(patientId)) notFound()
  const patient = await createPatientRepository(await getDb()).findById(patientId)
  if (!patient) notFound()

  return (
    <div>
      <UserMenu displayName={user.displayName} role={user.role} />
      <main className="mx-auto max-w-[1000px] space-y-4 p-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">Пациент #{patient.id}</h1>
          <Link href={`/patients/${patient.id}`} className="text-xs text-blue-700 hover:underline">
            ← к карточке
          </Link>
        </div>
        <PatientForm patient={patient as unknown as Record<string, unknown>} />
      </main>
    </div>
  )
}
