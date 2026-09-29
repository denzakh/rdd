import { LoginForm } from '@/features/auth/ui/login-form'
import { getDict } from '@/shared/lib/intl'

/**
 * Страница входа. Неавторизованных сюда же отправляет requireUser/middleware.
 * Локаль и словарь — из cookie на сервере (docs/en/i18n.md §4).
 */
export default async function LoginPage() {
  const [dict, common] = await Promise.all([getDict('auth'), getDict('common')])

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 p-6">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <header className="space-y-1 text-center">
          <h1 className="text-lg font-semibold">{dict.loginTitle}</h1>
          <p className="text-sm text-neutral-500">{common.appName}</p>
        </header>
        <LoginForm dict={dict} />
      </div>
    </main>
  )
}
