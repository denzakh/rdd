'use client'

import { useActionState, useState } from 'react'
import { loginAction, type LoginState } from '../api/actions'

const initialState: LoginState = {}

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  return (
    // ⚠️ action НЕ навешан на <form action=...>: server action принимает объект,
    // а не FormData — нативная отправка формы дала бы multipart, который на проде
    // разбирается неверно (см. LoginInput в ../api/actions). Поэтому submit
    // перехватываем и зовём action вручную с объектом.
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void formAction({ email, password })
      }}
      className="w-full max-w-sm space-y-4"
    >
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Пароль
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
      >
        {isPending ? 'Вход…' : 'Войти'}
      </button>
    </form>
  )
}
