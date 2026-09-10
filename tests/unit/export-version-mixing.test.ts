import { describe, expect, it } from 'vitest'
import { getDeidentifiedDataset } from '@/entities/phase/api/queries'

/**
 * docs/schema-evolution.md §9, критерий 4 / export.md §3: выгрузка несёт
 * registry_version ДЛЯ КАЖДОЙ строки; смешение кодов разных версий одной шкалы
 * без метки — недопустимо. Проверяем на синтетических данных с двумя версиями:
 * версии не «сливаются», а остаются различимы по строкам + в meta.registryVersions.
 */

interface PrepareAllRow {
  patient_id: number
  study_entry_date: string | null
  birth_year: number | null
  phase_order_id: number
  phase_start_date: string | null
  registry_version: number | null
  [key: string]: unknown
}

/** Минимальный стаб D1: только prepare().bind().all() — единственный вызов в getDeidentifiedDataset. */
const makeDb = (rows: PrepareAllRow[]) =>
  ({
    prepare: () => ({
      bind: () => ({
        all: async () => ({ results: rows }),
      }),
    }),
  }) as unknown as D1Database

describe('export: registry_version не смешивается (docs/schema-evolution.md §9 п.4)', () => {
  it('две версии в одной выгрузке: метка на строке + registryVersions', async () => {
    const db = makeDb([
      {
        patient_id: 1,
        study_entry_date: null,
        birth_year: null,
        phase_order_id: 1,
        phase_start_date: null,
        registry_version: 1,
      },
      {
        patient_id: 1,
        study_entry_date: null,
        birth_year: null,
        phase_order_id: 2,
        phase_start_date: null,
        registry_version: 2,
      },
    ])

    // k=1: порог подавления не отсекает группу из двух строк.
    const { rows, columns, meta } = await getDeidentifiedDataset(db, { mode: 'all' }, 1)

    expect(rows).toHaveLength(2)
    expect(rows.map((r) => r.registry_version)).toEqual([1, 2])
    // метка стоит сразу после seq_id — первая различающая колонка строки
    expect(columns[0]).toBe('seq_id')
    expect(columns[1]).toBe('registry_version')
    expect(meta.registryVersions).toEqual([1, 2])
  })

  it('выгрузка неподавленных строк НЕ теряет версию (стабильность против k-anonymity)', async () => {
    const db = makeDb([
      {
        patient_id: 1,
        study_entry_date: null,
        birth_year: null,
        phase_order_id: 1,
        phase_start_date: null,
        registry_version: 3,
      },
    ])
    const { rows, meta } = await getDeidentifiedDataset(db, { mode: 'all' }, 1)
    expect(rows).toHaveLength(1)
    expect(rows[0].registry_version).toBe(3)
    expect(meta.registryVersions).toEqual([3])
  })
})
