import { describe, expect, it } from 'vitest'
import { FLAT_REGISTRY } from '@/shared/config/registry'
import type { RegistryField } from '@/shared/config/registry/types'

/**
 * Реестр как источник PII-меток (docs/ru/export.md §3): прямые идентификаторы
 * обязаны нести pii:true, чтобы слой агрегации исключал их автоматически.
 */
describe('export: pii-метки реестра', () => {
  it('даты и год рождения помечены pii', () => {
    const fields = FLAT_REGISTRY as unknown as Record<string, RegistryField>
    for (const id of ['study_entry_date', 'birth_year', 'phase_start_date']) {
      expect(fields[id]?.pii, id).toBe(true)
    }
  })

  it('клинические признаки не помечены pii', () => {
    const fields = FLAT_REGISTRY as unknown as Record<string, RegistryField>
    for (const id of ['main_component', 'ad_efficacy', 'hamd_total', 'gender']) {
      expect(fields[id]?.pii ?? false, id).toBe(false)
    }
  })
})
