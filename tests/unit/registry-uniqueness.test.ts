import { describe, expect, it } from 'vitest'
import { FLAT_REGISTRY, REGISTRY } from '@/shared/config/registry'
import type { RegistryField } from '@/shared/config/registry/types'

/**
 * Guard от silent bug: FLAT_REGISTRY собирается spread'ом шести блоков
 * (patient / phase / remission / status / therapy / diagnostic).
 * Дублирующийся ключ между блоками молча перезапишет поле в плоской карте —
 * сломаются валидация API, to-zod, D1-схема и словарь одновременно.
 */
describe('registry: уникальность id полей', () => {
  const sections = Object.entries(REGISTRY) as Array<[string, Record<string, RegistryField>]>

  it('ключи шести блоков не пересекаются — FLAT_REGISTRY собран без перезаписи', () => {
    const perSectionKeys = sections.map(([name, block]) => ({
      name,
      keys: Object.keys(block),
    }))
    const allKeys = perSectionKeys.flatMap((s) => s.keys)
    const total = allKeys.length
    const flatSize = Object.keys(FLAT_REGISTRY).length

    // Дубликаты между блоками: какие ключи встречаются больше одного раза и где.
    const seen = new Map<string, string[]>()
    for (const { name, keys } of perSectionKeys) {
      for (const key of keys) {
        seen.set(key, [...(seen.get(key) ?? []), name])
      }
    }
    const duplicates = [...seen.entries()].filter(([, owners]) => owners.length > 1)

    expect(
      duplicates,
      duplicates.length > 0
        ? `коллизия id между блоками: ${duplicates.map(([k, owners]) => `${k} (${owners.join(' + ')})`).join(', ')}`
        : 'дублирующихся ключей нет'
    ).toEqual([])
    // Сумма ключей блоков обязана совпадать с размером плоской карты:
    // расхождение = поле потеряно при spread-сборке FLAT_REGISTRY.
    expect(
      flatSize,
      `FLAT_REGISTRY (${flatSize}) меньше суммы блоков (${total}) — есть перезапись`
    ).toBe(total)
  })

  it('ключ блока совпадает с field.id для каждого поля', () => {
    const mismatched: string[] = []
    for (const [section, block] of sections) {
      for (const [key, field] of Object.entries(block)) {
        if ((field as RegistryField).id !== key)
          mismatched.push(`${section}.${key} → id="${(field as RegistryField).id}"`)
      }
    }
    expect(mismatched, mismatched.join(', ')).toEqual([])
  })

  it('field.id уникальны глобально (защита от расхождения key/id)', () => {
    const allIds = sections.flatMap(([, block]) =>
      Object.values(block).map((f) => (f as RegistryField).id)
    )
    expect(
      new Set(allIds).size,
      `дублирующиеся field.id: ${allIds.filter((id, i) => allIds.indexOf(id) !== i).join(', ')}`
    ).toBe(allIds.length)
  })
})
