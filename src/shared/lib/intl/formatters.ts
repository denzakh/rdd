export type Locale = 'ru' | 'en'

export type IntlLocale = 'ru-RU' | 'en-US'

/** Cookie локали UI (docs/en/i18n.md §4). */
export const LOCALE_COOKIE = 'rdd_locale'

export const isLocale = (v: unknown): v is Locale => v === 'ru' || v === 'en'

export const resolveLocale = (v: unknown): Locale => (isLocale(v) ? v : 'ru')

/** Маппинг короткой локали UI на локаль Intl (docs/en/i18n.md §3). */
export const toIntlLocale = (locale: Locale): IntlLocale => (locale === 'en' ? 'en-US' : 'ru-RU')

/**
 * Локализованная строка реестра: `{ ru, en }` или простая строка (RU-фолбэк).
 * Единая точка резолва подписей полей и опций — фолбэк на ru осознанный:
 * клиницисты вводят данные на русском, английский слой не должен ронять UI.
 */
export type LocalizedText = { ru: string; en: string } | string

export const pickLocale = (text: LocalizedText, locale: Locale): string => {
  if (typeof text === 'string') return text
  return locale === 'en' ? (text.en ?? text.ru) : (text.ru ?? text.en)
}
/**
 * Форматирование даты в строку по стандарту Intl.
 * Принимает и короткую локаль UI ('ru'/'en'), и полную ('ru-RU'/'en-US').
 */
export const formatDate = (date: string | Date | number, locale: Locale | IntlLocale = 'ru-RU') => {
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''

  const intl: IntlLocale = locale === 'ru' ? 'ru-RU' : locale === 'en' ? 'en-US' : locale

  return new Intl.DateTimeFormat(intl, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}
