import Link from 'next/link'
import { requireUser, UserMenu } from '@/features/auth'
import { canWrite } from '@/shared/api/session-repo'
import { PatientForm } from '@/features/patients'

/** Создание пациента: паспортная часть из реестра. */
export default async function NewPatientPage() {
  const user = await requireUser()
  if (!canWrite(user)) {
    return (
      <div>
        <UserMenu displayName={user.displayName} role={user.role} />
        <main className="p-6 text-sm text-red-700">Доступ только для чтения.</main>
      </div>
    )
  }

  return (
    <div>
      <UserMenu displayName={user.displayName} role={user.role} />
      <main className="mx-auto max-w-[1000px] space-y-4 p-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">Новый пациент</h1>
          <Link href="/patients" className="text-xs text-blue-700 hover:underline">
            ← к списку
          </Link>
        </div>
        <PatientForm />
      </main>
    </div>
  )
}
