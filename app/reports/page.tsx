import { Header, requireUser } from '@/features/auth'
import { ExportPanel } from '@/features/reports'
import { getLocale } from '@/shared/lib/intl'

export default async function ReportsPage() {
  const user = await requireUser()
  const locale = await getLocale()
  const en = locale === 'en'

  return (
    <div>
      <Header displayName={user.displayName} role={user.role} />
      <main className="mx-auto max-w-[1000px] space-y-8 p-6">
        <h1 className="text-xl font-semibold">{en ? 'Reports' : 'Отчёты'}</h1>

        <ExportPanel locale={locale} />
      </main>
    </div>
  )
}
