'use client'

import { useActionState } from 'react'
import { acceptInviteAction, type AcceptInviteState } from '../api/actions'

const initialState: AcceptInviteState = {}

/** Форма завершения регистрации по инвайт-ссылке: имя + пароль. */
export function InviteAcceptForm({
  token,
  email,
  role,
}: {
  token: string
  email: string
  role: string
}) {
  const [state, formAction, isPending] = useActionState(acceptInviteAction, initialState)

  return (
    <form action={formAction} className="w-full max-w-sm space-y-4">
      <p className="text-sm text-neutral-600">
        Email: <b>{email}</b> · роль: <b>{role}</b>
      </p>
      <input type="hidden" name="token" value={token} />
      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          Имя
        </label>
        <input
          id="name"
          name="name"
          required
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Пароль (мин. 10 символов)
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
      </div>
      <div>
        <label htmlFor="repeat" className="block text-sm font-medium">
          Повторите пароль
        </label>
        <input
          id="repeat"
          name="repeat"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
      >
        {isPending ? 'Создание…' : 'Зарегистрироваться'}
      </button>
    </form>
  )
}
