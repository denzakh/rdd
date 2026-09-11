'use client'

/**
 * Минимальный переключатель RU/EN (docs/en/i18n.md §4, вариант A).
 * Cookie `rdd_locale` пишет Server Action `setLocaleAction`, затем refresh.
 */
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { setLocaleAction, type Locale } from '@/shared/lib/intl'

export function LocaleSwitcher({ locale }: { locale: Locale }) {
  const router = useRouter()
  const [pending, start] = useTransition()

  const switchTo = (next: Locale) => {
    start(async () => {
      await setLocaleAction(next)
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-1 text-xs" aria-label="Language / Язык">
      {(['ru', 'en'] as const).map((l) => (
        <button
          key={l}
          type="button"
          disabled={pending || l === locale}
          onClick={() => switchTo(l)}
          className={`rounded border px-1.5 py-0.5 uppercase ${
            l === locale
              ? 'border-neutral-900 bg-neutral-900 text-white'
              : 'border-neutral-300 hover:bg-neutral-100'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  )
}
