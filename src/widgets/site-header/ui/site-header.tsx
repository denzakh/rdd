import Image from 'next/image'
import Link from 'next/link'
import { LocaleSwitcher } from '@/shared/ui/locale-switcher'
import type { Locale, Namespaces } from '@/shared/lib/intl'

type LandingDict = Namespaces['landing']

/**
 * Публичная шапка витрины (docs/ru/spec-public-1.md §3): лого, «О проекте»,
 * переключатель языка, «Войти». Приватный `<Header/>` из features/auth не трогаем.
 */
export function SiteHeader({ locale, dict }: { locale: Locale; dict: LandingDict }) {
  return (
    <div className="border-b border-neutral-200">
      <div className="mx-auto flex max-w-[1000px] items-center justify-between px-6 py-2 text-sm">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Image src="/favicon.svg" alt="RDD" width={28} height={28} unoptimized />
          RDD
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/about" className="text-cyan-700 hover:opacity-80">
            {dict.about}
          </Link>
          <LocaleSwitcher locale={locale} />
          <Link
            href="/login"
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs text-white hover:bg-neutral-700"
          >
            {dict.login}
          </Link>
        </div>
      </div>
    </div>
  )
}
