import type { RegistryField } from '@/shared/config/registry/types'

/** Значение ячейки (решение 6 спеки: union вместо `any`). */
export type FieldValue = string | number | boolean | null

export interface MatrixColumn {
  id: string
  title: string
  order: number
  /** Флаг колонки 98 — «текущий статус» (подсветка border-amber-500). */
  isCurrentStatus?: boolean
}

export type MatrixScope = Exclude<RegistryField['scope'], undefined | 'patient'>

/** Элемент виртуализированного списка строк. */
export type MatrixRowItem =
  | { kind: 'section'; sectionId: string; title: string }
  | { kind: 'field'; field: RegistryField; index: number; totalFields: number }
