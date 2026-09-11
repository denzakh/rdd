'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ru, en } from '@/shared/lib/intl'
import type { Locale } from '@/shared/lib/intl'

/** Пункты верхнего меню (все — из неймспейса `common` словарей). */
const ITEMS = [
  { href: '/patients', key: 'patients' as const },
  { href: '/reports', key: 'reports' as const },
  { href: '/data-dictionary', key: 'dataDictionary' as const },
]

/**
 * Верхнее общее меню: Пациенты, Отчёты, Словарь данных.
 * Клиентский компонент — использует `usePathname()` для подсветки
 * активного раздела (включая вложенные роуты, напр. `/patients/123`).
 * Локаль и тексты получает из пропса `locale`, как и `<LocaleSwitcher />`.
 */
export function TopNavigation({ locale }: { locale: Locale }) {
  const pathname = usePathname() ?? ''
  const common = (locale === 'en' ? en : ru).common

  return (
    <nav className="flex items-center gap-6 text-sm">
      {ITEMS.map(({ href, key }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={
              active
                ? 'border-b-2 border-neutral-900 pb-1 font-medium text-neutral-900'
                : 'text-neutral-600 hover:text-neutral-900'
            }
          >
            {common[key]}
          </Link>
        )
      })}
    </nav>
  )
}
