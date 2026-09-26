'use client'

import { useActionState } from 'react'
import { createUserAction, type CreateUserState } from '../api/actions'
import { ROLES, DATA_SCOPES, scopeLabel, type AdminDict } from '../model/user-constants'

const initialState: CreateUserState = {}

export function CreateUserForm({ dict }: { dict: AdminDict }) {
  const [state, formAction, isPending] = useActionState(createUserAction, initialState)

  return (
    <form action={formAction} className="space-y-3">
      <h2 className="font-medium">{dict.newUserTitle}</h2>
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
          placeholder={dict.namePlaceholder}
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
        <select
          name="data_scope"
          defaultValue="all"
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        >
          {DATA_SCOPES.map((s) => (
            <option key={s} value={s}>
              {dict.seesPrefix}
              {scopeLabel(dict, s)}
            </option>
          ))}
        </select>
        <input
          name="site_id"
          placeholder={dict.siteFullPlaceholder}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {isPending ? '…' : dict.create}
        </button>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.password && (
        <p className="rounded-md bg-amber-50 p-2 text-sm">
          {dict.passwordFor} <b>{state.email}</b> {dict.shownOnce}:{' '}
          <code className="font-mono">{state.password}</code>
        </p>
      )}
    </form>
  )
}
