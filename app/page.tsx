import { getLocale, getDict } from '@/shared/lib/intl'
import { getCurrentUserSafe } from '@/shared/api'
import { Header } from '@/features/auth'
import { SiteHeader } from '@/widgets/site-header'
import { Landing } from '@/widgets/landing'

/**
 * Точка входа `/` (docs/ru/spec-public-2.md §2): гость → `<Landing/>` (PR1),
 * залогиненный → `<HomeHub/>` вместо редиректа на `/patients`.
 * Только `getLocale()` + `getCurrentUserSafe()`: `requireUser()` здесь запрещён
 * (иначе гость потерял бы лендинг), напрямую `getDb()` не вызывается.
 */
export default async function Home() {
  const [locale, user] = await Promise.all([getLocale(), getCurrentUserSafe()])

  const landing = await getDict('landing')

  return (
    <div>
      <SiteHeader locale={locale} dict={landing} />
      <Landing dict={landing} />
    </div>
  )
}
