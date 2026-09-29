'use client'

import { useActionState } from 'react'
import { loginAction, type LoginState } from '../api/actions'
import type { Namespaces } from '@/shared/lib/intl'

const initialState: LoginState = {}

/** Словарь auth приходит пропом со страницы: cookie с локалью читает сервер. */
export type AuthDict = Namespaces['auth']

export function LoginForm({ dict }: { dict: AuthDict }) {
  const [state, formAction, isPending] = useActionState(loginAction, initialState)

  return (
    <form action={formAction} className="w-full max-w-sm space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          {dict.email}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={dict.testEmail}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          {dict.password}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
      >
        {isPending ? dict.loggingIn : dict.login}
      </button>

      <p className="rounded-md bg-neutral-100 px-3 py-2 text-xs text-neutral-600">
        {dict.testPasswordHint}
      </p>
    </form>
  )
}
