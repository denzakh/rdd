import { redirect } from 'next/navigation'
import { requireUser } from '@/shared/api'
import {
  CreateUserForm,
  getActiveInvites,
  getUsers,
  InvitesPanel,
  UsersTable,
} from '@/features/users'
import { Header } from '@/features/auth'
import { getDict, getLocale } from '@/shared/lib/intl'

/**
 * Admin-UI пользователей (docs/ru/spec-stage-3.md §5).
 * Проверка роли — на сервере; non-admin получает redirect, а не скрытие UI.
 * Как на остальных приватных страницах: `<Header/>` над `<main>` (паттерн
 * `/patients`, `/docs`), словарь и локаль — из куки на сервере.
 */
export default async function AdminUsersPage() {
  const user = await requireUser()
  if (user.role !== 'admin') redirect('/patients')

  const [locale, dict] = await Promise.all([getLocale(), getDict('admin')])
  const [users, invites] = await Promise.all([getUsers(), getActiveInvites()])

  return (
    <div>
      <Header displayName={user.displayName} role={user.role} />
      <main className="mx-auto max-w-[1400px] space-y-6 p-6">
        <h1 className="text-xl font-semibold">{dict.pageTitle}</h1>
        <UsersTable users={users} dict={dict} locale={locale} />
        <div className="border-t border-neutral-200 pt-6">
          <CreateUserForm dict={dict} />
        </div>
        <div className="border-t border-neutral-200 pt-6">
          <InvitesPanel invites={invites} dict={dict} locale={locale} />
        </div>
      </main>
    </div>
  )
}
