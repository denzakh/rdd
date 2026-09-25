import { getLocale, getDict } from '@/shared/lib/intl'
import { getCurrentUserSafe } from '@/shared/api'
import { SiteHeader } from '@/widgets/site-header'
import { Landing } from '@/widgets/landing'

/**
 * Точка входа `/` (docs/ru/spec-public-1.md §2): публичная витрина `<Landing/>`
 * для гостя и для залогиненного одинаково — своего кабинета на `/` больше нет.
 * `getCurrentUserSafe()` остаётся ради sliding-renewal сессии (валидирует cookie
 * и продлевает TTL), но её результат не используется. `requireUser()` здесь
 * запрещён (иначе гость потерял бы лендинг), напрямую `getDb()` не вызывается.
 */
export default async function Home() {
  const [locale] = await Promise.all([getLocale(), getCurrentUserSafe()])

  const landing = await getDict('landing')

  return (
    <div>
      <SiteHeader locale={locale} dict={landing} />
      <Landing dict={landing} />
    </div>
  )
}
