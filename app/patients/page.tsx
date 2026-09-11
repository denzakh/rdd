import Link from 'next/link'
import { requireUser, UserMenu } from '@/features/auth'
import { canWrite } from '@/shared/api/session-repo'
import { getDb } from '@/shared/api/db'
import { createPatientRepository, patientScopeFor, PatientsTable } from '@/entities/patient'
import { getLocale } from '@/shared/lib/intl'
import { TopNavigation } from '@/shared/ui/top-navigation'

const PAGE_SIZE = 20

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const user = await requireUser()
  const sp = await searchParams
  const db = await getDb()
  const locale = await getLocale()
  const repo = createPatientRepository(db, patientScopeFor(user))

  const page = Math.max(1, Number(sp.page ?? 1) || 1)
  const [patients, total] = await Promise.all([
    repo.listPage({ q: sp.q, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    repo.count(sp.q),
  ])
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const en = locale === 'en'

  return (
    <div>
      <UserMenu displayName={user.displayName} role={user.role} />
      <TopNavigation locale={locale} />
      <main className="mx-auto max-w-[1000px] space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">
            {en ? 'Patients' : 'Пациенты'} ({total})
          </h1>
          <div className="flex items-center gap-2">
            <form className="flex items-center gap-1">
              <input
                type="search"
                name="q"
                defaultValue={sp.q}
                placeholder={en ? 'Patient #' : '№ пациента'}
                className="h-8 w-40 rounded border border-neutral-300 px-2 text-sm"
              />
              <button
                type="submit"
                className="rounded-md border border-neutral-300 px-3 py-1 text-xs hover:bg-neutral-100"
              >
                {en ? 'Search' : 'Найти'}
              </button>
            </form>
            {canWrite(user) && (
              <Link
                href="/patients/new"
                className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs text-white hover:bg-neutral-700"
              >
                {en ? 'New patient' : 'Новый пациент'}
              </Link>
            )}
          </div>
        </div>

        <PatientsTable patients={patients} locale={locale} />

        {totalPages > 1 && (
          <div className="flex gap-2 text-xs">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={`/patients?page=${p}${sp.q ? `&q=${sp.q}` : ''}`}
                className={`rounded border px-2 py-0.5 ${
                  p === page ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300'
                }`}
              >
                {p}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
