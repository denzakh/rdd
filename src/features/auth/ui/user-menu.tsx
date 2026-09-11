import { logoutAction } from '../api/actions'
import { getLocale } from '@/shared/lib/intl'
import type { Locale } from '@/shared/lib/intl'
import { LocaleSwitcher } from '@/shared/ui/locale-switcher'

/**
 * Содержимое меню пользователя (имя, роль, язык, выход) без собственной
 * обёртки. Серверный компонент — используется как внутри `<UserMenu />`,
 * так и внутри `<Header />` (справа в flex-строке).
 */
export function UserInfo({
  displayName,
  role,
  locale,
}: {
  displayName: string
  role: string
  locale: Locale
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-neutral-600">
        {displayName} · <span className="text-neutral-400">{role}</span>
      </span>
      <LocaleSwitcher locale={locale} />
      <form action={logoutAction}>
        <button
          type="submit"
          className="cursor-pointer rounded-md border border-neutral-300 px-3 py-1 text-xs hover:bg-neutral-100"
        >
          {locale === 'en' ? 'Log out' : 'Выйти'}
        </button>
      </form>
    </div>
  )
}

/**
 * Меню пользователя (имя, роль, язык, выход) в виде самостоятельной
 * строки с borderBottom. Серверный компонент.
 */
export async function UserMenu({ displayName, role }: { displayName: string; role: string }) {
  const locale = await getLocale()
  return (
    <div className="flex items-center justify-end gap-3 border-b border-neutral-200 px-6 py-2 text-sm">
      <UserInfo displayName={displayName} role={role} locale={locale} />
    </div>
  )
}
