import { logoutAction } from '../api/actions'

/** Меню пользователя (имя, роль, выход). Серверный компонент. */
export function UserMenu({ displayName, role }: { displayName: string; role: string }) {
  return (
    <div className="flex items-center justify-end gap-3 border-b border-neutral-200 px-6 py-2 text-sm">
      <span className="text-neutral-600">
        {displayName} · <span className="text-neutral-400">{role}</span>
      </span>
      <form action={logoutAction}>
        <button
          type="submit"
          className="rounded-md border border-neutral-300 px-3 py-1 text-xs hover:bg-neutral-100"
        >
          Выйти
        </button>
      </form>
    </div>
  )
}
