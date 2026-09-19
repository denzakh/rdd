import { REGISTRY, FLAT_REGISTRY, THERAPY_GROUPS } from '@/shared/config'
import type { RegistryField } from '@/shared/config'
import { fieldLabel as pickFieldLabel, type Locale } from '@/shared/lib/intl'
import type { MatrixRowItem, MatrixScope } from './types'

/**
 * Порядок секций матрицы: Контроль фазы, Психический статус,
 * Шкалы, Фармакотерапия, Ремиссия. Секция `patient` в матрицу фаз не входит.
 */
const SECTION_ORDER: Array<keyof typeof REGISTRY> = [
  'phase',
  'status',
  'diagnostic',
  'therapy',
  'remission',
]

const SECTION_TITLES: Record<keyof typeof REGISTRY, { ru: string; en: string }> = {
  patient: { ru: 'Пациент', en: 'Patient' },
  phase: { ru: 'Контроль фазы', en: 'Phase control' },
  therapy: { ru: 'Фармакотерапия', en: 'Pharmacotherapy' },
  remission: { ru: 'Ремиссия', en: 'Remission' },
  status: { ru: 'Психический статус', en: 'Mental status' },
  diagnostic: { ru: 'Шкалы', en: 'Scales' },
}

/**
 * Словари подгрупп по секциям (ключи секций REGISTRY → словарь подгрупп).
 * Заполняется только у секций с логической группировкой полей; секция без
 * записи рендерится плоским списком (subheader-строки не выводятся).
 */
const SECTION_GROUPS: Partial<
  Record<keyof typeof REGISTRY, Record<string, { ru: string; en: string }>>
> = {
  therapy: THERAPY_GROUPS,
}

/** Заголовок секции под локаль (RU-фолбэк). */
export function sectionTitle(section: keyof typeof REGISTRY, locale: Locale = 'ru'): string {
  const t = SECTION_TITLES[section]
  return locale === 'en' ? (t.en ?? t.ru) : (t.ru ?? t.en)
}

/**
 * Заголовок подгруппы секции под локаль (RU-фолбэк). Единственный источник
 * правды — словарь подгрупп рядом с блоком реестра (`THERAPY_GROUPS` и т.п.).
 * Если у секции нет словаря подгрупп или id неизвестен — падает на сам id.
 */
export function sectionGroupTitle(
  section: keyof typeof REGISTRY,
  groupId: string,
  locale: Locale = 'ru'
): string {
  const groups = SECTION_GROUPS[section]
  const t = groups?.[groupId]
  if (!t) return groupId
  return locale === 'en' ? (t.en ?? t.ru) : (t.ru ?? t.en)
}

/** Является ли поле вычисляемым (badge-readonly). */
export function isComputedField(field: RegistryField): boolean {
  return typeof field.calculate === 'function'
}

/** Разрешение локализованной подписи (RU-фолбэк, docs/en/i18n.md §3). */
export function fieldLabel(field: RegistryField, locale: Locale = 'ru'): string {
  return pickFieldLabel(field, locale)
}

/**
 * Текст тултипа для deprecated-поля старой записи (docs/schema-evolution.md
 * §6.1): «Устарело с версии N» + подсказка «См. вместо: <label replacedBy>».
 * Версия задаётся сверху (читается `field.deprecated_since`), label поля-замены
 * резолвится по реестру, при отсутствии — падает на id. Не-deprecated — undefined.
 */
export function deprecatedTooltip(field: RegistryField, locale: Locale = 'ru'): string | undefined {
  if (field.deprecated_since === undefined) return undefined
  let text =
    locale === 'en'
      ? `Deprecated since v${field.deprecated_since}`
      : `Устарело с версии ${field.deprecated_since}`
  if (field.replacedBy !== undefined) {
    const replacement = (FLAT_REGISTRY as unknown as Record<string, RegistryField>)[
      field.replacedBy
    ]
    const label = replacement ? fieldLabel(replacement, locale) : field.replacedBy
    text += locale === 'en' ? ` · See instead: ${label}` : ` · См. вместо: ${label}`
  }
  return text
}

/**
 * Скрыть ли колонку deprecated-поля целиком (docs/schema-evolution.md §6.1):
 * если ВСЕ версии записей текущего грида уже >= deprecated_since (поле не
 * входит в протокол для всех фаз) — строка не рендерится. Если хотя бы одна
 * запись старше — строка остаётся (доступ к старым данным), а withdrawn-ячейки
 * скрываются поштучно. Пустой список (нет фаз / нет версий) — не скрывать.
 */
export function isFieldRowHiddenForVersions(
  field: RegistryField,
  versions: readonly number[]
): boolean {
  const ds = field.deprecated_since
  if (ds === undefined || versions.length === 0) return false
  return versions.every((v) => v >= ds)
}
export function buildMatrixRows(
  scopes?: readonly MatrixScope[],
  locale: Locale = 'ru'
): MatrixRowItem[] {
  const rows: MatrixRowItem[] = []

  const sections = scopes ?? SECTION_ORDER
  // Поля с hide_in_matrix в грид не попадают (дубли-«авто»: тип точки уже
  // виден в заголовке колонки, интерпретация шкалы/итог ремиссии избыточны
  // рядом с исходными значениями). В реестре/applyComputed/словаре остаются.
  const visibleBySection = sections.map((section) =>
    (Object.values(REGISTRY[section]) as RegistryField[]).filter((f) => !f.hide_in_matrix)
  )
  // Первый проход — считаем только видимые поля, чтобы roving tabindex знал общее число
  let totalFields = 0
  for (const fields of visibleBySection) {
    totalFields += fields.length
  }

  let fieldIndex = 0
  sections.forEach((section, si) => {
    const fields = visibleBySection[si] ?? []
    if (fields.length === 0) return // пустую секцию (все поля скрыты) не показываем
    rows.push({
      kind: 'section',
      sectionId: section,
      title: sectionTitle(section, locale),
    })
    let lastGroup: string | undefined
    for (const field of fields) {
      // Подгруппа секции: subheader-строка при смене group (Вариант A).
      // Поля без group идут сразу после заголовка секции, без subheader.
      if (field.group !== undefined && field.group !== lastGroup) {
        rows.push({
          kind: 'subgroup',
          sectionId: section,
          groupId: field.group,
          title: sectionGroupTitle(section, field.group, locale),
        })
      }
      lastGroup = field.group
      rows.push({ kind: 'field', field, index: fieldIndex, totalFields })
      fieldIndex++
    }
  })
  return rows
}
