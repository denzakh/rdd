'use client'

import { useActionState } from 'react'
import { createUserAction, type CreateUserState } from '../actions'
import { ROLES } from '../model/user-repo'

const initialState: CreateUserState = {}

export function CreateUserForm() {
  const [state, formAction, isPending] = useActionState(createUserAction, initialState)

  return (
    <form action={formAction} className="space-y-3">
      <h2 className="font-medium">Новый пользователь</h2>
      <div className="flex flex-wrap gap-2">
        <input
          name="email"
          type="email"
          placeholder="email"
          required
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
        />
        <input
          name="name"
          placeholder="Имя"
          required
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
        />
        <select
          name="role"
          defaultValue="clinician"
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {isPending ? '…' : 'Создать'}
        </button>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.password && (
        <p className="rounded-md bg-amber-50 p-2 text-sm">
          Пароль для <b>{state.email}</b> (покажется один раз):{' '}
          <code className="font-mono">{state.password}</code>
        </p>
      )}
    </form>
  )
}
