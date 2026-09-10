import { describe, expect, it } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { FLAT_REGISTRY } from '@/shared/config/registry'
import type { RegistryField } from '@/shared/config/registry/types'
import {
  breakingChanges,
  fieldSnapshot,
  findUntrackedBreakingChanges,
  isBreakingTracked,
  type FieldEvolutionSnapshot,
  type RegistryEvolutionSnapshot,
} from '@/shared/lib/registry/evolution-guard'

/**
 * Guard-тест на diff реестра (docs/schema-evolution.md §3.1, §9 п.3).
 *
 * Ловит оба breaking-случая §3: (а) у select-поля исчезла опция из options,
 * (б) сузился диапазон min/max — без соответствующего увеличения
 * `deprecated_since` относительно снапшота `.registry-evolution-snapshot.json`
 * (аналог проверки синхронности d1-schema.ts/.schema-snapshot.json, stage-4 §2).
 *
 * Forward-compatible изменения (новая опция, новое поле, расширение диапазона)
 * НЕ являются нарушением — см. отдельные кейсы ниже.
 */

const SNAPSHOT_PATH = join(
  process.cwd(),
  'src',
  'shared',
  'config',
  'registry',
  '.registry-evolution-snapshot.json'
)

const readSnapshot = (): RegistryEvolutionSnapshot | null => {
  if (!existsSync(SNAPSHOT_PATH)) return null // появится после первой генерации baseline
  return JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8')) as RegistryEvolutionSnapshot
}

/** Библиотечный хелпер снапшота поля для кейсов guard. */
const sn = (s: Partial<FieldEvolutionSnapshot>): FieldEvolutionSnapshot => ({
  options: s.options ?? [],
  min: s.min ?? null,
  max: s.max ?? null,
  deprecated_since: s.deprecated_since ?? 0,
})

describe('registry evolution guard (§3.1): не падает на текущем реестре', () => {
  it('baseline совпадает с реестром — нарушений нет (CI-смоук)', () => {
    const snapshot = readSnapshot()
    if (!snapshot) return
    const violations = findUntrackedBreakingChanges(
      Object.values(FLAT_REGISTRY) as RegistryField[],
      snapshot
    )
    expect(violations, JSON.stringify(violations)).toEqual([])
  })
})

describe('registry evolution guard (§3.1): ловит оба breaking-случая', () => {
  it('(а) исчезновение опции у select без deprecated_since — блок', () => {
    const base = sn({ options: [1, 2, 3] })
    const cur = sn({ options: [1, 3] })
    expect(breakingChanges(cur, base)).toContain('option-removed')
    expect(breakingChanges({ ...cur, options: [1, 2, 3, 4] }, base)).toEqual([])
  })

  it('(б) сужение диапазона min/max без deprecated_since — блок', () => {
    const base = sn({ min: 0, max: 100 })
    const cur = sn({ min: 10, max: 50 })
    expect(breakingChanges(cur, base)).toContain('range-narrowed')
    expect(breakingChanges({ ...cur, min: 0, max: 100 }, base)).toEqual([])
  })

  it('broken + declared deprecated_since (увеличен) — НЕ блок', () => {
    const base = sn({ options: [1, 2, 3], deprecated_since: 0 })
    const cur = sn({ options: [1, 3], deprecated_since: 3 })
    expect(breakingChanges(cur, base)).toContain('option-removed')
    expect(isBreakingTracked(cur, base)).toBe(true)
  })
})

describe('registry evolution guard (§3.1): без false positive на forward-compatible', () => {
  it('новая опция добавлена — не breaking', () => {
    const base = sn({ options: [1, 2], min: 1, max: 2 })
    const cur = sn({ options: [1, 2, 3], min: 1, max: 2 })
    expect(breakingChanges(cur, base)).toEqual([])
  })

  it('новое поле (нет в снапшоте) — пропускается', () => {
    const newField: RegistryField = {
      id: 'brand_new_scale',
      label: 'Новая шкала',
      ui: 'select',
      db_type: 'INTEGER',
      options: [
        { value: 1, label: 'a' },
        { value: 2, label: 'b' },
      ],
    }
    const violations = findUntrackedBreakingChanges([newField], { baseline_version: 1, fields: {} })
    expect(violations).toEqual([])
  })

  it('расширение диапазона (min вниз / max вверх) — не breaking', () => {
    const base = sn({ min: 0, max: 50 })
    const cur = sn({ min: 0, max: 70 })
    expect(breakingChanges(cur, base)).toEqual([])
  })
})

describe('registry evolution guard: fieldSnapshot нормализует отсутствующие границы', () => {
  it('undefined min/max → null, опции по insertion order', () => {
    const field: RegistryField = {
      id: 'x',
      label: 'X',
      ui: 'select',
      options: [
        { value: 2, label: 'b' },
        { value: 1, label: 'a' },
      ],
    }
    expect(fieldSnapshot(field)).toEqual({
      options: [2, 1],
      min: null,
      max: null,
      deprecated_since: 0,
    })
  })
})
