import { redirect } from 'next/navigation'
import { requireUser } from '@/shared/api'
import {
  CreateUserForm,
  getActiveInvites,
  getUsers,
  InvitesPanel,
  UsersTable,
} from '@/features/users'
import { UserMenu } from '@/features/auth'

/**
 * Admin-UI пользователей (docs/spec-stage-3.md §5).
 * Проверка роли — на сервере; non-admin получает redirect, а не скрытие UI.
 */
export default async function AdminUsersPage() {
  const user = await requireUser()
  if (user.role !== 'admin') redirect('/patients')

  const [users, invites] = await Promise.all([getUsers(), getActiveInvites()])

  return (
    <main className="mx-auto max-w-5xl p-6">
      <UserMenu displayName={user.displayName} role={user.role} />
      <h1 className="mt-6 mb-4 text-lg font-semibold">Пользователи</h1>
      <UsersTable users={users} />
      <div className="mt-8 border-t border-neutral-200 pt-6">
        <CreateUserForm />
      </div>
      <div className="mt-8 border-t border-neutral-200 pt-6">
        <InvitesPanel invites={invites} />
      </div>
    </main>
  )
}
