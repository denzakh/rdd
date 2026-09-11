export { diffYears, diffMonths, getAgeGroup, map_age_to_group } from './calculations'
export {
  formatDate,
  isLocale,
  LOCALE_COOKIE,
  pickLocale,
  resolveLocale,
  toIntlLocale,
  type IntlLocale,
  type Locale,
  type LocalizedText,
} from './formatters'
export { fieldLabel, optionLabel } from './labels'
export { getDict, getLocale, setLocaleAction } from './server'
export { en } from './dictionaries/en'
export { ru } from './dictionaries/ru'
export type { LocaleDict, Namespace, Namespaces } from './dictionaries'
