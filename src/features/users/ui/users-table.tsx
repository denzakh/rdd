import { changeRoleAction, lockUserAction, unlockUserAction } from '../actions'
import { ROLES, type AdminUser } from '../model/user-repo'
import { ResetPasswordForm } from './reset-password-form'

const fmt = (iso: string | null): string => (iso ? new Date(iso).toLocaleString('ru-RU') : '—')

const lockedNow = (u: AdminUser): boolean =>
  u.lockedUntil !== null && new Date(u.lockedUntil) > new Date()

/** Таблица пользователей (admin). Мутации — Server Actions с проверкой на сервере. */
export function UsersTable({ users }: { users: AdminUser[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-neutral-500">
          <th className="py-2">Email</th>
          <th>Имя</th>
          <th>Роль</th>
          <th>Блокировка</th>
          <th>Создан</th>
          <th>Действия</th>
        </tr>
      </thead>
      <tbody>
        {users.map((u) => (
          <tr key={u.id} className="border-b border-neutral-100 align-top">
            <td className="py-2 pr-2">{u.email}</td>
            <td className="pr-2">{u.displayName}</td>
            <td className="pr-2">
              <form action={changeRoleAction} className="inline-flex items-center gap-1">
                <input type="hidden" name="id" value={u.id} />
                <select
                  name="role"
                  defaultValue={u.role}
                  className="rounded border border-neutral-300 px-1 py-0.5 text-xs"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <button type="submit" className="text-xs underline hover:text-neutral-700">
                  ОК
                </button>
              </form>
            </td>
            <td className="pr-2 text-xs">
              {lockedNow(u) ? (
                <span className="text-red-600">до {fmt(u.lockedUntil)}</span>
              ) : u.failedAttempts > 0 ? (
                <span className="text-neutral-500">неудачных: {u.failedAttempts}</span>
              ) : (
                '—'
              )}
            </td>
            <td className="pr-2 text-xs text-neutral-500">{fmt(u.createdAt)}</td>
            <td className="space-y-1 py-2 text-xs">
              {lockedNow(u) ? (
                <form action={unlockUserAction}>
                  <input type="hidden" name="id" value={u.id} />
                  <button type="submit" className="underline hover:text-neutral-700">
                    Разблокировать
                  </button>
                </form>
              ) : (
                <form action={lockUserAction}>
                  <input type="hidden" name="id" value={u.id} />
                  <button type="submit" className="underline hover:text-neutral-700">
                    Заблокировать
                  </button>
                </form>
              )}
              <div>
                <ResetPasswordForm userId={u.id} />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
