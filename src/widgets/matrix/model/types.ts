import type { RegistryField } from '@/shared/config'

/** Значение ячейки (решение 6 спеки: union вместо `any`). */
export type FieldValue = string | number | boolean | null

export interface MatrixColumn {
  id: string
  title: string
  order: number
  /**
   * Семантический номер фазы (phases.phase_relative_id): 1..97 — обычные фазы,
   * 98 — «Поступление», 99 — «Выписка». Используется для подсветки служебных
   * колонок и логики доступности is_current_only-полей.
   */
  relativeId?: number
  /** Служебная фаза (98/99): колонка выделяется светло-серым. */
  isSystemPhase?: boolean
  /** Флаг колонки 98 — «текущий статус» (поля is_current_only доступны здесь). */
  isCurrentStatus?: boolean
}

export type MatrixScope = Exclude<RegistryField['scope'], undefined | 'patient'>

/** Элемент виртуализированного списка строк. */
export type MatrixRowItem =
  | { kind: 'section'; sectionId: string; title: string }
  | { kind: 'field'; field: RegistryField; index: number; totalFields: number }
