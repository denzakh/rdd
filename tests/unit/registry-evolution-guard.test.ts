import { describe, expect, it } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import type { SessionUser } from '@/shared/api/session-repo'
import { FLAT_REGISTRY } from '@/shared/config/registry'
import type { RegistryField } from '@/shared/config/registry/types'
import {
  breakingChanges,
  fieldSnapshot,
  findUntrackedBreakingChanges,
  isBreakingTracked,
  isDeprecatedForRecord,
  isEditable,
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

  it('boundary appears where none existed (undefined → число) — блок для min и max по отдельности', () => {
    // min раньше не был ограничен (было [x, +∞)) — появилась нижняя граница
    const baseMin = sn({ max: 100 })
    const curMin = sn({ min: 0, max: 100 })
    expect(breakingChanges(curMin, baseMin)).toContain('range-narrowed')

    // max раньше не был ограничен — появилась верхняя граница
    const baseMax = sn({ min: 0 })
    const curMax = sn({ min: 0, max: 50 })
    expect(breakingChanges(curMax, baseMax)).toContain('range-narrowed')

    // появляется граница + явно увеличенный deprecated_since — НЕ блок
    expect(isBreakingTracked({ ...curMax, deprecated_since: 3 }, baseMax)).toBe(true)
  })

  it('снятие границы (число → undefined) — расширение, не breaking', () => {
    const base = sn({ min: 0, max: 50 })
    const cur = sn({ min: 0 }) // max убран
    expect(breakingChanges(cur, base)).toEqual([])
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

describe('registry evolution guard: isDeprecatedForRecord / isEditable (docs/schema-evolution.md §6.1)', () => {
  const deprecated: RegistryField = {
    id: 'ad_efficacy',
    label: 'Эффективность АД',
    ui: 'select',
    options: [{ value: 1, label: 'a' }],
    deprecated_since: 2,
    replacedBy: 'ad_efficacy_v2',
  }
  const plain: RegistryField = { id: 'x', label: 'X', ui: 'select' }

  const user = (role: 'admin' | 'readonly'): SessionUser => ({
    id: 'u1',
    email: 'u@test.local',
    displayName: 'U',
    role,
    dataScope: 'all',
    siteId: null,
    mustChangePassword: false,
  })

  it('isDeprecatedForRecord: старая запись (v < deprecated_since) → true, новые/пустые → false', () => {
    expect(isDeprecatedForRecord(deprecated, 1)).toBe(true)
    expect(isDeprecatedForRecord(deprecated, 0)).toBe(true)
    expect(isDeprecatedForRecord(deprecated, 2)).toBe(false)
    expect(isDeprecatedForRecord(deprecated, 5)).toBe(false)
    expect(isDeprecatedForRecord(deprecated, null)).toBe(false)
    expect(isDeprecatedForRecord(deprecated, undefined)).toBe(false)
    expect(isDeprecatedForRecord(plain, 1)).toBe(false)
  })

  it('isEditable: admin + обычное поле → true', () => {
    expect(isEditable(user('admin'), plain, 1)).toBe(true)
  })

  it('isEditable: deprecated-причина ИЗОЛИРОВАННО (write-роль, полный canWrite) → false', () => {
    // canWrite(admin)=true, а deprecated=true (старая запись v < deprecated_since).
    // Итог обязан быть false ТОЛЬКО из-за deprecated-проверки. Именно этот кейс
    // ловит ошибку `||` вместо `&&`: при `canWrite || !deprecated` здесь было бы
    // `true || false = true`, что недопустимо.
    expect(isEditable(user('admin'), deprecated, 1)).toBe(false)
  })

  it('isEditable: readonly-причина ИЗОЛИРОВАННО (активное поле) → false', () => {
    // deprecated неактивен (актуальное поле / v >= deprecated_since), readonly даёт false по роли.
    expect(isEditable(user('readonly'), plain, 1)).toBe(false)
    expect(isEditable(user('readonly'), deprecated, 5)).toBe(false)
  })

  it('isEditable: readonly + deprecated на старой записи — ОБЕ причины вместе → false', () => {
    // Связка из критериев приёмки: read-only по двум независимым причинам одновременно
    // (canWrite=false ПО РОЛИ И deprecated=true по версии записи), ни одна не ломает другую.
    expect(isEditable(user('readonly'), deprecated, 1)).toBe(false)
  })
})
