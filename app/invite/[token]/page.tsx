import { notFound } from 'next/navigation'
import { getDb } from '@/shared/api/db'
import { findValidInvite } from '@/features/users/model/invite-repo'
import { InviteAcceptForm } from '@/features/users'

/** Приём инвайта (docs/spec-stage-3.md §6): доступен без сессии. */
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const invite = await findValidInvite(await getDb(), token)
  if (!invite) notFound()

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 p-6">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <header className="space-y-1 text-center">
          <h1 className="text-lg font-semibold">Приглашение в регистр</h1>
          <p className="text-sm text-neutral-500">Задайте имя и пароль для входа</p>
        </header>
        <InviteAcceptForm token={token} email={invite.email} role={invite.role} />
      </div>
    </main>
  )
}
