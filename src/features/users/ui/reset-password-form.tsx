'use client'

import { useActionState } from 'react'
import { resetPasswordAction, type ResetPasswordState } from '../api/actions'

const initialState: ResetPasswordState = {}

export function ResetPasswordForm({
  userId,
  label,
  buttonClass = 'rounded-md border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100 disabled:opacity-50',
}: {
  userId: string
  /** Подпись кнопки из словаря `admin` (клиентский компонент словарь не читает). */
  label: string
  /** Класс кнопки: таблица переиспользует свою компактную стилизацию. */
  buttonClass?: string
}) {
  const [state, formAction, isPending] = useActionState(resetPasswordAction, initialState)

  return (
    <form action={formAction} className="inline-flex items-center gap-1">
      <input type="hidden" name="id" value={userId} />
      {state.password && (
        <code className="rounded bg-amber-50 px-1 font-mono text-xs">{state.password}</code>
      )}
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
      <button type="submit" disabled={isPending} className={buttonClass}>
        {label}
      </button>
    </form>
  )
}
