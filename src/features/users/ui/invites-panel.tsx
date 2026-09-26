'use client'

import { useActionState } from 'react'
import { createInviteAction, revokeInviteAction, type CreateInviteState } from '../api/actions'
import { ROLES, type AdminDict } from '../model/user-constants'
import type { Invite } from '../model/invite-repo'

const initialState: CreateInviteState = {}

function InviteForm({ dict }: { dict: AdminDict }) {
  const [state, formAction, isPending] = useActionState(createInviteAction, initialState)

  return (
    <form action={formAction} className="space-y-3">
      <h2 className="font-medium">{dict.newInviteTitle}</h2>
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
          {isPending ? '…' : dict.create}
        </button>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.link && (
        <p className="rounded-md bg-amber-50 p-2 text-sm">
          {dict.linkOnce} <code className="font-mono break-all">{state.link}</code>
        </p>
      )}
    </form>
  )
}

/** Инвайты: создание + список активных с отзывом. */
export function InvitesPanel({
  invites,
  dict,
  locale,
}: {
  invites: Invite[]
  dict: AdminDict
  locale: string
}) {
  const fmt = (iso: string): string =>
    new Date(iso).toLocaleString(locale === 'en' ? 'en-US' : 'ru-RU')
  return (
    <section className="space-y-4">
      <InviteForm dict={dict} />
      {invites.length > 0 && (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
              <th className="px-2 py-1.5 font-medium">{dict.colEmail}</th>
              <th className="px-2 py-1.5 font-medium">{dict.colRole}</th>
              <th className="px-2 py-1.5 font-medium">{dict.colExpires}</th>
              <th className="px-2 py-1.5" />
            </tr>
          </thead>
          <tbody>
            {invites.map((i) => (
              <tr key={i.id} className="border-b border-neutral-100 align-middle">
                <td className="px-2 py-1.5">{i.email}</td>
                <td className="px-2 py-1.5">{i.role}</td>
                <td className="px-2 py-1.5 text-xs text-neutral-500">{fmt(i.expiresAt)}</td>
                <td className="px-2 py-1.5">
                  <form action={revokeInviteAction}>
                    <input type="hidden" name="id" value={i.id} />
                    <button
                      type="submit"
                      className="rounded border border-neutral-300 px-1.5 py-0.5 text-xs hover:bg-neutral-100"
                    >
                      {dict.revoke}
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
