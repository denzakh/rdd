import { logoutAction, requireUser } from '@/features/auth'
import MatrixDemoPage from './matrix-demo'

/**
 * Серверная обёртка: авторизация + пользовательское меню.
 * requireUser() редиректит на /login при отсутствии/невалидной сессии.
 * Здесь же берётся actor_id для аудита всех будущих мутаций страницы.
 */
export default async function MatrixPage() {
  const user = await requireUser()

  return (
    <div>
      <div className="flex items-center justify-end gap-3 border-b border-neutral-200 px-6 py-2 text-sm">
        <span className="text-neutral-600">
          {user.displayName} · <span className="text-neutral-400">{user.role}</span>
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
      <MatrixDemoPage />
    </div>
  )
}
