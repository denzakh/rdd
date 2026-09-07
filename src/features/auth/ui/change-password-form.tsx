'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { changePasswordAction, type ChangePasswordState } from '../api/actions'

const initialState: ChangePasswordState = {}

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(changePasswordAction, initialState)

  if (state.ok) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-green-700">Пароль изменён.</p>
        <Link href="/patients" className="text-sm underline">
          Продолжить работу
        </Link>
      </div>
    )
  }

  return (
    <form action={formAction} className="w-full max-w-sm space-y-4">
      {(
        [
          ['current', 'Текущий пароль', 'current-password'],
          ['password', 'Новый пароль', 'new-password'],
          ['repeat', 'Повторите новый пароль', 'new-password'],
        ] as const
      ).map(([name, label, autoComplete]) => (
        <div key={name}>
          <label htmlFor={name} className="block text-sm font-medium">
            {label}
          </label>
          <input
            id={name}
            name={name}
            type="password"
            autoComplete={autoComplete}
            required
            minLength={name === 'current' ? 1 : 10}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
        </div>
      ))}

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
      >
        {isPending ? 'Сохранение…' : 'Сменить пароль'}
      </button>
    </form>
  )
}
