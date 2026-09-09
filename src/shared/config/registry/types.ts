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
  /** Верхняя/нижняя граница для числовых полей (используется в to-zod). */
  min?: number
  max?: number
  /** Для шкал 98, 99 — поле доступно только для текущего/выходного статуса */
  is_current_only?: boolean
  /**
   * PII-метка registry-driven де-идентификации (см. docs/export.md).
   * Поле с `pii: true` — прямой идентификатор или квази-идентификатор,
   * который автоматически исключается/маскируется на шаге агрегации
   * (queries.ts → getDeidentifiedDataset), ДО любой сериализации
   * (csv/json/xlsx). Сериализаторы PII не видят и не фильтруют —
   * это инвариант: новый формат экспорта не может забыть маскирование.
   */
  pii?: boolean
  /**
   * Вычисляемое поле. Единый контракт: вызывается с объектом строки
   * `(row: Record<string, unknown>) => any`. Контекст-зависимые поля
   * (номера фаз по индексу списка) не исполняются здесь — они являются
   * строковыми спеками (не функциями) и реализуются в UI-слое (матрица).
   */
  calculate?: (row: Record<string, unknown>) => any
  /** Принадлежность к секции регистра. */
  scope?: 'patient' | 'phase'
}

export type RegistryBlock = Record<string, RegistryField>
