'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ru, en } from '@/shared/lib/intl'
import type { Locale } from '@/shared/lib/intl'
import Image from 'next/image'

/**
 * Пункты верхнего меню (все — из неймспейса `common` словарей).
 * `Документация` ведёт в приватный `/docs` (docs/ru/spec-public-2.md §1 п.4):
 * меню рендерится только внутри приватного `<Header/>`, у витрины своя навигация.
 */
const ITEMS = [
  { href: '/patients', key: 'patients' as const },
  { href: '/reports', key: 'reports' as const },
  { href: '/data-dictionary', key: 'dataDictionary' as const },
  { href: '/docs', key: 'documentation' as const },
]

/**
 * Верхнее общее меню: Пациенты, Отчёты, Словарь данных, Документация.
 * Клиентский компонент — использует `usePathname()` для подсветки
 * активного раздела (включая вложенные роуты, напр. `/patients/123`).
 * Локаль и тексты получает из пропса `locale`, как и `<LocaleSwitcher />`.
 */
export function TopNavigation({ locale }: { locale: Locale }) {
  const pathname = usePathname() ?? ''
  const common = (locale === 'en' ? en : ru).common

  return (
    <nav className="flex items-center gap-6 text-sm">
      <div className="opacity-80">
        <Image src="/favicon.svg" alt="RDD" width={32} height={32} unoptimized />
      </div>
      {ITEMS.map(({ href, key }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={active ? 'font-semibold text-neutral-900' : 'text-cyan-700 hover:opacity-80'}
          >
            {common[key]}
          </Link>
        )
      })}
    </nav>
  )
}
