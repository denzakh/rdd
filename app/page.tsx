import { redirect } from 'next/navigation'
import { getLocale, getDict } from '@/shared/lib/intl'
import { getCurrentUserSafe } from '@/shared/api'
import { SiteHeader } from '@/widgets/site-header'
import { Landing } from '@/widgets/landing'

/**
 * Публичная витрина `/` (docs/ru/spec-public-1.md §2): гость → `<Landing/>`,
 * залогиненный → редирект на `/patients` (хаб — это public-2).
 * Только `getLocale()` + `getCurrentUserSafe()`, никаких `getDb()/requireUser()`.
 */
export default async function Home() {
  const [locale, landing] = await Promise.all([getLocale(), getDict('landing')])
  const user = await getCurrentUserSafe()
  if (user) redirect('/patients')

  return (
    <div>
      <SiteHeader locale={locale} dict={landing} />
      <Landing dict={landing} />
    </div>
  )
}
