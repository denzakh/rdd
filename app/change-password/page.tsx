import { ChangePasswordForm } from '@/features/auth/ui/change-password-form'
import { requireUser } from '@/shared/api'

/** Страница смены пароля (в т.ч. принудительной — must_change_password=1). */
export default async function ChangePasswordPage() {
  await requireUser()
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 p-6">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <header className="space-y-1 text-center">
          <h1 className="text-lg font-semibold">Смена пароля</h1>
          <p className="text-sm text-neutral-500">
            Минимум 10 символов. Другие сессии будут завершены.
          </p>
        </header>
        <ChangePasswordForm />
      </div>
    </main>
  )
}
