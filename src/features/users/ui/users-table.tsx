import {
  changeDataScopeAction,
  changeRoleAction,
  lockUserAction,
  unlockUserAction,
} from '../api/actions'
import { ROLES, DATA_SCOPES, scopeLabel, type AdminDict } from '../model/user-constants'
import type { AdminUser } from '../model/user-repo'
import { ResetPasswordForm } from './reset-password-form'

const fmt = (iso: string | null, locale: string): string =>
  iso ? new Date(iso).toLocaleString(locale === 'en' ? 'en-US' : 'ru-RU') : '—'

const lockedNow = (u: AdminUser): boolean =>
  u.lockedUntil !== null && new Date(u.lockedUntil) > new Date()

/** Компактная кнопка-действие в ячейке «Действия» (одна линия с соседней). */
const actionBtn = 'rounded border border-neutral-300 px-1.5 py-0.5 text-xs hover:bg-neutral-100'

/**
 * Таблица пользователей (admin). Мутации — Server Actions с проверкой на сервере.
 * Тексты — из словаря `admin`, который приходит пропом со страницы (server
 * component читает локаль через `getDict('admin')`).
 */
export function UsersTable({
  users,
  dict,
  locale,
}: {
  users: AdminUser[]
  dict: AdminDict
  locale: string
}) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
          <th className="px-2 py-1.5 font-medium">{dict.colEmail}</th>
          <th className="px-2 py-1.5 font-medium">{dict.colName}</th>
          <th className="px-2 py-1.5 font-medium">{dict.colRole}</th>
          <th className="px-2 py-1.5 font-medium">{dict.colVisibility}</th>
          <th className="px-2 py-1.5 font-medium">{dict.colLock}</th>
          <th className="px-2 py-1.5 font-medium">{dict.colCreated}</th>
          <th className="px-2 py-1.5 font-medium">{dict.colActions}</th>
        </tr>
      </thead>
      <tbody>
        {users.map((u) => (
          <tr key={u.id} className="border-b border-neutral-100 align-middle">
            <td className="px-2 py-1.5">{u.email}</td>
            <td className="px-2 py-1.5">{u.displayName}</td>
            <td className="px-2 py-1.5">
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
            <td className="px-2 py-1.5">
              <form action={changeDataScopeAction} className="inline-flex items-center gap-1">
                <input type="hidden" name="id" value={u.id} />
                <select
                  name="data_scope"
                  defaultValue={u.dataScope}
                  className="rounded border border-neutral-300 px-1 py-0.5 text-xs"
                >
                  {DATA_SCOPES.map((s) => (
                    <option key={s} value={s}>
                      {scopeLabel(dict, s)}
                    </option>
                  ))}
                </select>
                <input
                  name="site_id"
                  defaultValue={u.siteId ?? ''}
                  placeholder={dict.sitePlaceholder}
                  className="w-16 rounded border border-neutral-300 px-1 py-0.5 text-xs"
                />
                <button type="submit" className="text-xs underline hover:text-neutral-700">
                  ОК
                </button>
              </form>
            </td>
            <td className="px-2 py-1.5 text-xs">
              {lockedNow(u) ? (
                <span className="text-red-600">
                  {dict.lockedUntil} {fmt(u.lockedUntil, locale)}
                </span>
              ) : u.failedAttempts > 0 ? (
                <span className="text-neutral-500">
                  {dict.failedAttempts}
                  {u.failedAttempts}
                </span>
              ) : (
                '—'
              )}
            </td>
            <td className="px-2 py-1.5 text-xs text-neutral-500">{fmt(u.createdAt, locale)}</td>
            <td className="px-2 py-1.5">
              <div className="flex flex-wrap items-center gap-1">
                {lockedNow(u) ? (
                  <form action={unlockUserAction}>
                    <input type="hidden" name="id" value={u.id} />
                    <button type="submit" className={actionBtn}>
                      {dict.unlockUser}
                    </button>
                  </form>
                ) : (
                  <form action={lockUserAction}>
                    <input type="hidden" name="id" value={u.id} />
                    <button type="submit" className={actionBtn}>
                      {dict.lockUser}
                    </button>
                  </form>
                )}
                <ResetPasswordForm
                  userId={u.id}
                  label={dict.resetPassword}
                  buttonClass={actionBtn}
                />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
