/**
 * Серверные helpers локали (docs/en/i18n.md §4): cookie `rdd_locale`, дефолт `ru`.
 * Сами серверные чтения/записи cookie живут на Edge/Node (next/headers);
 * чистые хелперы (locale/resolveLocale/constants) — в `formatters.ts` (клиент+сервер).
 */
'use server'

import { cookies } from 'next/headers'
import { dictFor, type Namespace, type Namespaces } from './dictionaries'
import { LOCALE_COOKIE, resolveLocale } from './formatters'
import type { Locale } from './formatters'

/** Текущая локаль (server-side, из cookie). */
export async function getLocale(): Promise<Locale> {
  const store = await cookies()
  return resolveLocale(store.get(LOCALE_COOKIE)?.value)
}

/** Словарь неймспейса под текущую локаль (server components). */
export async function getDict<NS extends Namespace>(ns: NS): Promise<Namespaces[NS]> {
  const locale = await getLocale()
  return dictFor(locale)[ns]
}

/** Переключатель языка (Server Action, клиентский `<LocaleSwitcher />`). */
export async function setLocaleAction(locale: Locale): Promise<void> {
  const store = await cookies()
  store.set(LOCALE_COOKIE, resolveLocale(locale), {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
}
