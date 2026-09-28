import type { RegistryField, RegistryOption } from '@/shared/config/registry/types'
import { pickLocale, type Locale } from './formatters'

/** Подпись поля реестра под локаль (EN-фолбэк, docs/en/i18n.md §3). */
export const fieldLabel = (field: RegistryField, locale: Locale = 'en'): string =>
  pickLocale(field.label, locale)

/** Подпись опции реестра под локаль (EN-фолбэк; в БД лежат коды, не текст). */
export const optionLabel = (opt: RegistryOption, locale: Locale = 'en'): string =>
  pickLocale(opt.label, locale)
