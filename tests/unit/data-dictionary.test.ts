import { describe, expect, it } from 'vitest'
import { buildDataDictionary } from '@/shared/lib/registry/data-dictionary'
import { FLAT_REGISTRY } from '@/shared/config/registry'

describe('buildDataDictionary', () => {
  const sections = buildDataDictionary()

  it('покрывает все 6 разделов реестра и все поля FLAT_REGISTRY', () => {
    expect(sections.map((s) => s.key).sort()).toEqual(
      ['diagnostic', 'patient', 'phase', 'remission', 'status', 'therapy'].sort()
    )
    const ids = sections.flatMap((s) => s.entries.map((e) => e.id))
    expect(new Set(ids).size).toBe(Object.keys(FLAT_REGISTRY).length)
  })

  it('вычисляемые поля не имеют колонки в БД, остальные — patients/phases по scope', () => {
    const all = sections.flatMap((s) => s.entries)
    for (const e of all) {
      const field = (FLAT_REGISTRY as unknown as Record<string, Record<string, unknown>>)[e.id]
      if (field.calculate) expect(e.storage).toBeNull()
      else expect(['patients', 'phases']).toContain(e.storage)
    }
    const ageGroup = all.find((e) => e.id === 'age_group')
    expect(ageGroup?.allowed).toContain('до 50 лет')
    const hamd = all.find((e) => e.id === 'hamd_total')
    expect(hamd?.allowed).toBe('от 0 до 52')
  })
})
