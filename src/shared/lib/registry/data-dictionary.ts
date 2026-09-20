import { REGISTRY, THERAPY_GROUPS } from '@/shared/config/registry'
import type { RegistryField } from '@/shared/config/registry/types'
import { DB_TYPE_TO_SQL } from './d1-schema'
import { fieldLabel, optionLabel, type Locale } from '../intl'

/** Названия разделов реестра (RU/EN, docs/en/i18n.md §3). */
const SECTION_TITLES: Record<keyof typeof REGISTRY, { ru: string; en: string }> = {
  patient: { ru: 'Паспорт пациента', en: 'Patient passport' },
  phase: { ru: 'Контроль фазы', en: 'Phase control' },
  remission: { ru: 'Ремиссия', en: 'Remission' },
  status: { ru: 'Психический статус', en: 'Mental status' },
  therapy: { ru: 'Терапия', en: 'Therapy' },
  diagnostic: { ru: 'Диагностические шкалы', en: 'Rating scales' },
}

/** Строка допустимых значений для колонки «Допустимые значения». */
const allowedValues = (field: RegistryField, locale: Locale = 'ru'): string => {
  if (field.options && field.options.length > 0) {
    return field.options.map((o) => `${o.value} — ${optionLabel(o, locale)}`).join('; ')
  }
  if (field.db_type === 'BOOLEAN')
    return locale === 'en'
      ? '0 (no) / 1 (yes); NULL — not filled'
      : '0 (нет) / 1 (да); NULL — не заполнено'
  if (field.min !== undefined || field.max !== undefined) {
    return locale === 'en'
      ? `from ${field.min ?? '−∞'} to ${field.max ?? '+∞'}`
      : `от ${field.min ?? '−∞'} до ${field.max ?? '+∞'}`
  }
  if (locale === 'en') {
    switch (field.db_type) {
      case 'DATE':
        return 'date in ISO-8601 (YYYY-MM-DD)'
      case 'TEXT':
        return 'free text'
      case 'FLOAT':
        return 'floating-point number'
      case 'INTEGER':
        return 'integer'
    }
    return '—'
  }
  switch (field.db_type) {
    case 'DATE':
      return 'дата в формате ISO-8601 (ГГГГ-ММ-ДД)'
    case 'TEXT':
      return 'свободный текст'
    case 'FLOAT':
      return 'число с плавающей точкой'
    case 'INTEGER':
      return 'целое число'
  }
  return '—'
}

export interface DictionaryEntry {
  id: string
  label: string
  ui: RegistryField['ui']
  dbType: string
  sqlType: string
  allowed: string
  /** Целевая таблица БД; null — вычисляемое поле (колонки нет). */
  storage: 'patients' | 'phases' | null
  isComputed: boolean
  isCurrentOnly: boolean
  /** Скрыто из матрицы (hide_in_matrix), но видно в словаре/экспорте. */
  hiddenInMatrix: boolean
  /** Версия протокола, с которой поле deprecated (docs/ru/schema-evolution.md §6). */
  deprecatedSince: number | null
  /** Поле-замена (id), см. docs/ru/schema-evolution.md §3.1 (`replacedBy`). */
  replacedBy: string | null
  /** Локализованный заголовок подгруппы (`group`), null — поле без подгруппы. */
  group: string | null
}

export interface DictionarySection {
  key: string
  title: string
  entries: DictionaryEntry[]
}

/**
 * Словари подгрупп по секциям реестра (для колонки «Подгруппа» словаря).
 * Единственный источник правды — словари рядом с блоками реестра
 * (`THERAPY_GROUPS` и т.п.), как и в матрице (`SECTION_GROUPS`).
 */
const SECTION_GROUPS: Partial<
  Record<keyof typeof REGISTRY, Record<string, { ru: string; en: string }>>
> = {
  therapy: THERAPY_GROUPS,
}

/**
 * Автогенерируемый Data Dictionary из единственного источника правды —
 * реестра полей `src/shared/config/registry`. Никаких ручных описаний:
 * страница /data-dictionary всегда синхронна с реестром.
 * Локаль подписей — параметром (RU-фолбэк, docs/en/i18n.md §3).
 */
export const buildDataDictionary = (locale: Locale = 'ru'): DictionarySection[] =>
  (Object.entries(REGISTRY) as [keyof typeof REGISTRY, Record<string, RegistryField>][]).map(
    ([key, fields]) => {
      const groups = SECTION_GROUPS[key]
      const groupTitle = (id: string | undefined): string | null => {
        if (id === undefined || !groups) return null
        const t = groups[id]
        if (!t) return id
        return locale === 'en' ? (t.en ?? t.ru) : (t.ru ?? t.en)
      }
      return {
        key,
        title:
          locale === 'en' ? (SECTION_TITLES[key]?.en ?? key) : (SECTION_TITLES[key]?.ru ?? key),
        entries: Object.values(fields).map((field) => ({
          id: field.id,
          label: fieldLabel(field, locale),
          ui: field.ui,
          dbType: field.db_type ?? '— (вычисляемое)',
          sqlType: field.db_type ? DB_TYPE_TO_SQL[field.db_type] : '—',
          allowed: allowedValues(field, locale),
          storage: field.calculate ? null : field.scope === 'patient' ? 'patients' : 'phases',
          isComputed: Boolean(field.calculate),
          isCurrentOnly: Boolean(field.is_current_only),
          hiddenInMatrix: Boolean(field.hide_in_matrix),
          deprecatedSince: field.deprecated_since ?? null,
          replacedBy: field.replacedBy ?? null,
          group: groupTitle(field.group),
        })),
      }
    }
  )
