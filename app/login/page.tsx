import { LoginForm } from '@/features/auth/ui/login-form'

/** Страница входа. Неавторизованных сюда же отправляет requireUser/middleware. */
export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 p-6">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <header className="space-y-1 text-center">
          <h1 className="text-lg font-semibold">Вход в регистр</h1>
          <p className="text-sm text-neutral-500">RDD · депрессивные расстройства</p>
        </header>
        <LoginForm />
      </div>
    </main>
  )
}
