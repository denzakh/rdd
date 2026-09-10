import { REGISTRY, FLAT_REGISTRY } from '@/shared/config'
import type { RegistryField } from '@/shared/config'
import type { MatrixRowItem, MatrixScope } from './types'

/**
 * Порядок секций матрицы (§4 спеки): Фармакотерапия, Ремиссия,
 * Психический статус, Шкалы. Секция `patient` в матрицу фаз не входит.
 */
const SECTION_ORDER: Array<keyof typeof REGISTRY> = [
  'phase',
  'therapy',
  'remission',
  'status',
  'diagnostic',
]

const SECTION_TITLES: Record<keyof typeof REGISTRY, string> = {
  patient: 'Пациент',
  phase: 'Контроль фазы',
  therapy: 'Фармакотерапия',
  remission: 'Ремиссия',
  status: 'Психический статус',
  diagnostic: 'Шкалы',
}

/** Является ли поле вычисляемым (badge-readonly). */
export function isComputedField(field: RegistryField): boolean {
  return typeof field.calculate === 'function'
}

/** Разрешение локализованной подписи. */
export function fieldLabel(field: RegistryField): string {
  return typeof field.label === 'string' ? field.label : field.label.ru
}

/**
 * Текст тултипа для deprecated-поля старой записи (docs/schema-evolution.md
 * §6.1): «Устарело с версии N» + подсказка «См. вместо: <label replacedBy>».
 * Версия задаётся сверху (читается `field.deprecated_since`), label поля-замены
 * резолвится по реестру, при отсутствии — падает на id. Не-deprecated — undefined.
 */
export function deprecatedTooltip(field: RegistryField): string | undefined {
  if (field.deprecated_since === undefined) return undefined
  let text = `Устарело с версии ${field.deprecated_since}`
  if (field.replacedBy !== undefined) {
    const replacement = (FLAT_REGISTRY as unknown as Record<string, RegistryField>)[
      field.replacedBy
    ]
    const label = replacement ? fieldLabel(replacement) : field.replacedBy
    text += ` · См. вместо: ${label}`
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
export function buildMatrixRows(scopes?: readonly MatrixScope[]): MatrixRowItem[] {
  const rows: MatrixRowItem[] = []
  let fieldIndex = 0
  let totalFields = 0

  const sections = scopes ?? SECTION_ORDER
  // Первый проход — считаем поля, чтобы roving tabindex знал общее число
  for (const section of sections) {
    totalFields += Object.values(REGISTRY[section]).length
  }

  for (const section of sections) {
    rows.push({
      kind: 'section',
      sectionId: section,
      title: SECTION_TITLES[section],
    })
    for (const field of Object.values(REGISTRY[section]) as RegistryField[]) {
      rows.push({ kind: 'field', field, index: fieldIndex, totalFields })
      fieldIndex++
    }
  }
  return rows
}
