import { FLAT_REGISTRY } from '@/shared/config/registry'
import type { RegistryField } from '@/shared/config/registry/types'
import { REGISTRY_CURRENT_VERSION } from './d1-schema'

/**
 * Guard-логика эволюции реестра (docs/schema-evolution.md §3.1, §9).
 *
 * Breaking-правка (исчезновение опции select-поля / сужение диапазона min|max)
 * обязана сопровождаться ЯВНЫМ увеличением `deprecated_since` относительно
 * снапшота-базлайна. Если склассифицированное breaking-изменение есть, а
 * `deprecated_since` не увеличился — guard падает в CI с указанием поля.
 * Решение о semantic-изменении всегда человеческое (§3.1): тест не «понимает»
 * клинический смысл, а лишь мешает внести правку и забыть проставить флаг.
 *
 * Полноценного diff-движка здесь нет и не нужно — две условия из §3.
 */
export type BreakingKind = 'option-removed' | 'range-narrowed'

/** Снапшот «семантического следа» одного поля на дату baseline. */
export interface FieldEvolutionSnapshot {
  /** Значения options (для select). Пустой — если опций не было вовсе. */
  options: Array<string | number>
  /** Нижняя граница числового диапазона; null — не задана. */
  min: number | null
  /** Верхняя граница; null — не задана. */
  max: number | null
  /** deprecated_since на дату baseline (0 — не устаревшее). */
  deprecated_since: number
}

export interface RegistryEvolutionSnapshot {
  /** Версия протокола, на которой составлен baseline. */
  baseline_version: number
  fields: Record<string, FieldEvolutionSnapshot>
}

export const fieldSnapshot = (field: RegistryField): FieldEvolutionSnapshot => ({
  options: (field.options ?? []).map((o) => o.value),
  min: field.min ?? null,
  max: field.max ?? null,
  deprecated_since: field.deprecated_since ?? 0,
})

/**
 * Есть ли у поля хоть одно из двух «разбивающих» измерений, за которыми мы
 * следим в guard-тесте (§3.1): options (select) или числовой диапазон min/max.
 * Вычисляемые поля исключаются: их значения не хранятся в БД и не смешивают
 * исторические коды — deprecation-семантика к ним неприменима.
 */
const hasBreakingDimensions = (f: RegistryField): boolean =>
  !f.calculate && ((f.options?.length ?? 0) > 0 || f.min !== undefined || f.max !== undefined)

/**
 * Собрать снапшот из ТЕКУЩЕГО реестра — источник baseline-файла
 * `src/shared/config/registry/.registry-evolution-snapshot.json` и инструмент
 * для его перегенерации после осознанной breaking-правки.
 */
export const snapshotFromRegistry = (): RegistryEvolutionSnapshot => {
  const fields: Record<string, FieldEvolutionSnapshot> = {}
  for (const field of Object.values(FLAT_REGISTRY) as RegistryField[]) {
    if (!hasBreakingDimensions(field)) continue
    fields[field.id] = fieldSnapshot(field)
  }
  return { baseline_version: REGISTRY_CURRENT_VERSION, fields }
}

/**
 * Breaking-изменения поля относительно baseline (порядок не важен,
 * количества — сколько нашли).
 *
 * - (а) опция, бывшая в baseline, исчезла из текущих options;
 * - (б) диапазон сузился: min поднят или max опущен у НЕ пустого диапазона.
 *
 * Новые опции и расширение диапазона — forward-compatible (§3) и не
 * классифицируются как breaking.
 */
export function breakingChanges(
  current: FieldEvolutionSnapshot,
  baseline: FieldEvolutionSnapshot
): BreakingKind[] {
  const kinds: BreakingKind[] = []

  if (baseline.options.length > 0 && current.options.length > 0) {
    const present = new Set(current.options)
    if (baseline.options.some((v) => !present.has(v))) kinds.push('option-removed')
  }

  const minNarrow = baseline.min !== null && current.min !== null && current.min > baseline.min
  const maxNarrow = baseline.max !== null && current.max !== null && current.max < baseline.max
  if (minNarrow || maxNarrow) kinds.push('range-narrowed')

  return kinds
}

/** Declared ли breaking через явное увеличение deprecated_since против baseline. */
export const isBreakingTracked = (
  current: FieldEvolutionSnapshot,
  baseline: FieldEvolutionSnapshot
): boolean => current.deprecated_since > baseline.deprecated_since

export interface UntrackedFieldChange {
  fieldId: string
  kinds: BreakingKind[]
}

/**
 * Поля реестра, где есть breaking-изменение относительно baseline БЕЗ
 * соответствующего увеличения deprecated_since. Пустой массив — guard зелёный.
 */
export function findUntrackedBreakingChanges(
  fields: RegistryField[],
  snapshot: RegistryEvolutionSnapshot
): UntrackedFieldChange[] {
  const violations: UntrackedFieldChange[] = []
  for (const field of fields) {
    const baseline = snapshot.fields[field.id]
    if (!baseline) continue // новое поле — forward-compatible, ядра снапшота нет
    const current = fieldSnapshot(field)
    const kinds = breakingChanges(current, baseline)
    if (kinds.length > 0 && !isBreakingTracked(current, baseline)) {
      violations.push({ fieldId: field.id, kinds })
    }
  }
  return violations
}
