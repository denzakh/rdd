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
  /** Локализованная подпись опции: `{ ru, en }` или простая строка (RU-фолбэк). */
  label: { ru: string; en: string } | string
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
   * Версия протокола, с которой поле выведено из употребления
   * (docs/ru/schema-evolution.md §3, §6). Поле НЕ удаляется из реестра и из
   * D1-схемы: существующие колонки остаются читаемыми, словарь показывает
   * пометку «deprecated с vN», diff-генератор такую колонку не дропает.
   */
  deprecated_since?: number
  /**
   * Опциональная подсказка «чем заменено поле» (docs/ru/schema-evolution.md §3.1,
   * §6.1): id поля-замены, заведённого рядом со старым (путь 1 из §5).
   * Используется в UI (тултип/словарь); обязательно для deprecated-полей,
   * когда существует целевой аналог.
   */
  replacedBy?: string
  /**
   * PII-метка registry-driven де-идентификации (см. docs/ru/export.md).
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
  /**
   * Скрыть строку поля из виджета «Матрица» (`buildMatrixRows` фильтрует
   * такие поля). Поле остаётся в реестре: видно в Data Dictionary,
   * участвует в `applyComputed` и экспорте. Используется для «авто»-строк,
   * дублирующих уже видимые данные (тип точки в заголовке колонки,
   * интерпретация шкалы рядом с баллом, итог ремиссии).
   */
  hide_in_matrix?: boolean
  /**
   * Логическая подгруппа внутри секции реестра (Вариант A, матрица §4).
   * Реестр остаётся плоским («Поле = колонка» — D1/Zod/экспорт не меняются);
   * группировка используется только для отображения: subheader-строки
   * в матрице (`buildMatrixRows`) и группировка в Data Dictionary.
   * Словарь подгрупп — рядом с блоком (напр. `THERAPY_GROUPS` в therapy.ts).
   */
  group?: string
  /** Принадлежность к секции регистра. */
  scope?: 'patient' | 'phase'
}

export type RegistryBlock = Record<string, RegistryField>
