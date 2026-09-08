import { REGISTRY } from '@/shared/config/registry'
import type { RegistryField } from '@/shared/config/registry/types'
import { DB_TYPE_TO_SQL } from './d1-schema'

/** Русские названия разделов реестра. */
const SECTION_TITLES: Record<keyof typeof REGISTRY, string> = {
  patient: 'Паспорт пациента',
  phase: 'Контроль фазы',
  remission: 'Ремиссия',
  status: 'Психический статус',
  therapy: 'Терапия',
  diagnostic: 'Диагностические шкалы',
}

/** Строка допустимых значений для колонки «Допустимые значения». */
const allowedValues = (field: RegistryField): string => {
  if (field.options && field.options.length > 0) {
    return field.options.map((o) => `${o.value} — ${o.label}`).join('; ')
  }
  if (field.db_type === 'BOOLEAN') return '0 (нет) / 1 (да); NULL — не заполнено'
  if (field.min !== undefined || field.max !== undefined) {
    return `от ${field.min ?? '−∞'} до ${field.max ?? '+∞'}`
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
}

export interface DictionarySection {
  key: string
  title: string
  entries: DictionaryEntry[]
}

/**
 * Автогенерируемый Data Dictionary из единственного источника правды —
 * реестра полей `src/shared/config/registry`. Никаких ручных описаний:
 * страница /data-dictionary всегда синхронна с реестром.
 */
export const buildDataDictionary = (): DictionarySection[] =>
  (Object.entries(REGISTRY) as [keyof typeof REGISTRY, Record<string, RegistryField>][]).map(
    ([key, fields]) => ({
      key,
      title: SECTION_TITLES[key] ?? key,
      entries: Object.values(fields).map((field) => ({
        id: field.id,
        label: typeof field.label === 'string' ? field.label : field.label.ru,
        ui: field.ui,
        dbType: field.db_type ?? '— (вычисляемое)',
        sqlType: field.db_type ? DB_TYPE_TO_SQL[field.db_type] : '—',
        allowed: allowedValues(field),
        storage: field.calculate ? null : field.scope === 'patient' ? 'patients' : 'phases',
        isComputed: Boolean(field.calculate),
        isCurrentOnly: Boolean(field.is_current_only),
      })),
    })
  )
