import Link from 'next/link'
import { en, ru } from '@/shared/lib/intl'
import type { Locale } from '@/shared/lib/intl'

/** Минимум данных шапки хаба — совпадает по структуре с `SessionUser`. */
export type HubUser = {
  displayName: string
  role: string
}

/**
 * Приватный хаб залогиненного на `/` (docs/ru/spec-public-2.md §4):
 * приветствие `displayName · role`, поиск в пациентах, 4 карточки-ссылки
 * и подсказка для `role=readonly`. Живых агрегатов и новых SQL здесь нет,
 * тексты — из неймспейса `homeHub` словарей.
 */
export function HomeHub({ user, locale }: { user: HubUser; locale: Locale }) {
  const dict = (locale === 'en' ? en : ru).homeHub
  const common = (locale === 'en' ? en : ru).common

  const cards = [
    { href: '/patients', title: dict.cardPatientsTitle, text: dict.cardPatientsText },
    { href: '/reports', title: dict.cardReportsTitle, text: dict.cardReportsText },
    {
      href: '/data-dictionary',
      title: dict.cardDictionaryTitle,
      text: dict.cardDictionaryText,
    },
    { href: '/docs', title: dict.cardDocsTitle, text: dict.cardDocsText },
  ]

  return (
    <main className="mx-auto flex max-w-[1000px] flex-col gap-8 px-6 py-10">
      <section className="space-y-2">
        <h1 className="text-3xl font-bold">{dict.title}</h1>
        <p className="text-sm text-neutral-600">
          {dict.greeting} {user.displayName} · <span className="text-neutral-400">{user.role}</span>
        </p>
      </section>

      <form action="/patients" method="get" className="flex items-center gap-2">
        <input
          type="search"
          name="q"
          placeholder={dict.searchPlaceholder}
          className="h-9 w-56 rounded border border-neutral-300 px-3 text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700"
        >
          {dict.search}
        </button>
      </form>

      <section className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-lg border border-neutral-200 p-4 hover:bg-neutral-50"
          >
            <h2 className="font-semibold">{c.title}</h2>
            <p className="mt-1 text-sm text-neutral-600">{c.text}</p>
            <span className="mt-2 inline-block text-xs text-cyan-700">{common.open}</span>
          </Link>
        ))}
      </section>

      {user.role === 'readonly' && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">{common.readOnly}</p>
      )}
    </main>
  )
}
