import { logoutAction } from '../api/actions'
import { getLocale } from '@/shared/lib/intl'
import { LocaleSwitcher } from '@/shared/ui/locale-switcher'

/** Меню пользователя (имя, роль, язык, выход). Серверный компонент. */
export function UserMenu({ displayName, role }: { displayName: string; role: string }) {
  return <UserMenuInner displayName={displayName} role={role} localePromise={getLocale()} />
}

async function UserMenuInner({
  displayName,
  role,
  localePromise,
}: {
  displayName: string
  role: string
  localePromise: Promise<'ru' | 'en'>
}) {
  const locale = await localePromise
  return (
    <div className="flex items-center justify-end gap-3 border-b border-neutral-200 px-6 py-2 text-sm">
      <span className="text-neutral-600">
        {displayName} · <span className="text-neutral-400">{role}</span>
      </span>
      <LocaleSwitcher locale={locale} />
      <form action={logoutAction}>
        <button
          type="submit"
          className="rounded-md border border-neutral-300 px-3 py-1 text-xs hover:bg-neutral-100"
        >
          {locale === 'en' ? 'Log out' : 'Выйти'}
        </button>
      </form>
    </div>
  )
}
