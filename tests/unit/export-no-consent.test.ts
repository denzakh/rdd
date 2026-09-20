import { describe, expect, it } from 'vitest'
import { getDeidentifiedDataset } from '@/entities/phase/api/queries'

/**
 * Решение docs/ru/consent.md §1: версия и дата согласия в статистическую выгрузку
 * НЕ входят — метка ИС нужна для сверки с этическим комитетом, а не биостатистику
 * (фильтр «отозван → исключён» при этом действует).
 * Guard: если consent-поля появятся в `getDeidentifiedDataset` (columns/rows),
 * тест падает и требует явного пересмотра решения (порог эскалации — consent.md §3).
 */

/** Минимальный стаб D1: только prepare().bind().all() — единственный вызов в выборке. */
const makeDb = (rows: Array<Record<string, unknown>>) =>
  ({
    prepare: () => ({ bind: () => ({ all: async () => ({ results: rows }) }) }),
  }) as unknown as D1Database

const FORBIDDEN = ['consent_version', 'consent_date', 'consent_withdrawn_at']

describe('export: поля согласия не попадают в де-идентифицированный датасет', () => {
  it('columns и строки не содержат consent-полей, даже если БД их отдала', async () => {
    const db = makeDb([
      {
        patient_id: 1,
        study_entry_date: '2024-01-01',
        birth_year: 1980,
        phase_order_id: 1,
        phase_start_date: '2024-02-01',
        registry_version: 1,
        consent_version: '1',
        consent_date: '2024-01-01',
        consent_withdrawn_at: null,
      },
    ])

    const { columns, rows } = await getDeidentifiedDataset(db, { mode: 'all' })

    expect(rows).toHaveLength(1)
    for (const key of FORBIDDEN) {
      expect(columns, key).not.toContain(key)
      expect(Object.keys(rows[0]), key).not.toContain(key)
    }
  })
})
