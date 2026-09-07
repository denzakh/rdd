'use client'

import { useActionState } from 'react'
import { resetPasswordAction, type ResetPasswordState } from '../actions'

const initialState: ResetPasswordState = {}

export function ResetPasswordForm({ userId }: { userId: string }) {
  const [state, formAction, isPending] = useActionState(resetPasswordAction, initialState)

  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="id" value={userId} />
      {state.password && (
        <code className="mr-2 rounded bg-amber-50 px-1 font-mono text-xs">{state.password}</code>
      )}
      {state.error && <span className="mr-2 text-xs text-red-600">{state.error}</span>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100 disabled:opacity-50"
      >
        Сбросить пароль
      </button>
    </form>
  )
}
