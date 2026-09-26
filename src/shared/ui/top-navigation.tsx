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
 * Пункт `adminOnly` (`/admin/users`) показывается только при role=admin; сама
 * страница дополнительно проверяет роль на сервере (docs/ru/spec-stage-3.md §5).
 */
const ITEMS = [
  { href: '/patients', key: 'patients' as const, adminOnly: false },
  { href: '/reports', key: 'reports' as const, adminOnly: false },
  { href: '/data-dictionary', key: 'dataDictionary' as const, adminOnly: false },
  { href: '/docs', key: 'documentation' as const, adminOnly: false },
  { href: '/admin/users', key: 'userManagement' as const, adminOnly: true },
]

/**
 * Верхнее общее меню: Пациенты, Отчёты, Словарь данных, Документация
 * (для админа дополнительно — Пользователи).
 * Лого слева — ссылка на главную `/` (публичная витрина, docs/ru/spec-public-1.md §2).
 * Клиентский компонент — использует `usePathname()` для подсветки
 * активного раздела (включая вложенные роуты, напр. `/patients/123`).
 * Локаль и тексты получает из пропса `locale`, как и `<LocaleSwitcher />`.
 * `role` — для показа admin-пункта (это скрытие UI, не авторизация).
 */
export function TopNavigation({ locale, role }: { locale: Locale; role?: string }) {
  const pathname = usePathname() ?? ''
  const common = (locale === 'en' ? en : ru).common
  const items = ITEMS.filter((item) => !item.adminOnly || role === 'admin')

  return (
    <nav className="flex items-center gap-6 text-sm">
      {/* Лого — ссылка на главную витрину `/` (та же точка входа, что и у SiteHeader). */}
      <Link
        href="/"
        title={common.home}
        aria-label={common.home}
        className="flex items-center opacity-80 hover:opacity-100"
      >
        <Image src="/favicon.svg" alt="RDD" width={32} height={32} unoptimized />
      </Link>
      {items.map(({ href, key }) => {
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
