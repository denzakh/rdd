import type { RegistryField, RegistryOption } from '@/shared/config/registry/types'
import { DEFAULT_LOCALE, pickLocale, type Locale } from './formatters'

/** Подпись поля реестра под локаль (по умолчанию `DEFAULT_LOCALE`, docs/en/i18n.md §3). */
export const fieldLabel = (field: RegistryField, locale: Locale = DEFAULT_LOCALE): string =>
  pickLocale(field.label, locale)

/** Подпись опции реестра под локаль (в БД лежат коды, не текст). */
export const optionLabel = (opt: RegistryOption, locale: Locale = DEFAULT_LOCALE): string =>
  pickLocale(opt.label, locale)
