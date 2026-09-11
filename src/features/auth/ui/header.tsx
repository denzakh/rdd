import { TopNavigation } from '@/shared/ui/top-navigation'
import { UserInfo } from './user-menu'
import { getLocale } from '@/shared/lib/intl'

/**
 * Верхняя строка приложения: левая часть — навигация (Пациенты, Отчёты,
 * Словарь данных), правая часть — имя пользователя, переключатель языка и
 * кнопка выхода.
 *
 * Внешний блок имеет borderBottom на всю ширину, внутренний — flex-правила
 * с ограничением `mx-auto max-w-[1000px]` и отступами. Серверный компонент:
 * локаль получает через `getLocale()`.
 */
export async function Header({ displayName, role }: { displayName: string; role: string }) {
  const locale = await getLocale()

  return (
    <div className="border-b border-neutral-200">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-2 text-sm">
        <TopNavigation locale={locale} />
        <UserInfo displayName={displayName} role={role} locale={locale} />
      </div>
    </div>
  )
}
