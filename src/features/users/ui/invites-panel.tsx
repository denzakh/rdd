'use client'

import { useActionState } from 'react'
import { createInviteAction, revokeInviteAction, type CreateInviteState } from '../api/actions'
import { ROLES } from '../model/user-constants'
import type { Invite } from '../model/invite-repo'

const initialState: CreateInviteState = {}

function InviteForm() {
  const [state, formAction, isPending] = useActionState(createInviteAction, initialState)

  return (
    <form action={formAction} className="space-y-3">
      <h2 className="font-medium">Новый инвайт (ссылка живёт 7 дней)</h2>
      <div className="flex flex-wrap gap-2">
        <input
          name="email"
          type="email"
          placeholder="email"
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
      {state.link && (
        <p className="rounded-md bg-amber-50 p-2 text-sm">
          Ссылка (покажется один раз): <code className="font-mono break-all">{state.link}</code>
        </p>
      )}
    </form>
  )
}

/** Инвайты: создание + список активных с отзывом. */
export function InvitesPanel({ invites }: { invites: Invite[] }) {
  return (
    <section className="space-y-4">
      <InviteForm />
      {invites.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-neutral-500">
              <th className="py-2">Email</th>
              <th>Роль</th>
              <th>Истекает</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {invites.map((i) => (
              <tr key={i.id} className="border-b border-neutral-100">
                <td className="py-2">{i.email}</td>
                <td>{i.role}</td>
                <td className="text-xs text-neutral-500">
                  {new Date(i.expiresAt).toLocaleString('ru-RU')}
                </td>
                <td>
                  <form action={revokeInviteAction}>
                    <input type="hidden" name="id" value={i.id} />
                    <button type="submit" className="text-xs underline hover:text-red-700">
                      Отозвать
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
