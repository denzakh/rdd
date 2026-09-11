import type { RegistryField, RegistryOption } from '@/shared/config/registry/types'
import { pickLocale, type Locale } from './formatters'

/** Подпись поля реестра под локаль (RU-фолбэк, docs/en/i18n.md §3). */
export const fieldLabel = (field: RegistryField, locale: Locale = 'ru'): string =>
  pickLocale(field.label, locale)

/** Подпись опции реестра под локаль (RU-фолбэк; в БД лежат коды, не текст). */
export const optionLabel = (opt: RegistryOption, locale: Locale = 'ru'): string =>
  pickLocale(opt.label, locale)
