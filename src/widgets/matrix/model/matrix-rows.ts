import { REGISTRY } from '@/shared/config/registry'
import type { RegistryField } from '@/shared/config/registry/types'
import type { MatrixRowItem, MatrixScope } from '../types'

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
 * Плоский список строк грида: заголовки секций вперемешку с полями.
 * Строится один раз на изменение реестра (useMemo в MatrixGrid).
 */
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
