/**
 * Возможные варианты UI-рендеринга поля (см. раздел 3.2 rdd-v1.md).
 * Помимо базовых вариантов из документа здесь объявлены фактически
 * используемые в регистрах (`number-readonly`, `select-readonly`,
 * `radio-group`).
 */
export type UIComponent =
  | 'text-input'
  | 'number-input'
  | 'checkbox'
  | 'select'
  | 'date-picker'
  | 'badge-readonly'
  | 'toggle-binary'
  | 'number-readonly'
  | 'select-readonly'
  | 'radio-group'

export interface RegistryOption {
  value: number | string
  label: string
}

export interface RegistryField {
  id: string
  /** Локализованная подпись: `{ ru, en }` или простая строка. */
  label: { ru: string; en: string } | string
  ui: UIComponent
  db_type?: 'INTEGER' | 'BOOLEAN' | 'TEXT' | 'DATE' | 'FLOAT'
  options?: RegistryOption[]
  /** Для шкал 98, 99 — поле доступно только для текущего/выходного статуса */
  is_current_only?: boolean
  /**
   * Вычисляемое поле. Принимает произвольные аргументы:
   * - большинство полей: `(data: Record<string, any>) => any`;
   * - поля фаз: `(index: number, total: number) => any`.
   */
  calculate?: (...args: any[]) => any
  /** Принадлежность к секции регистра. */
  scope?: 'patient' | 'phase'
}

export type RegistryBlock = Record<string, RegistryField>
