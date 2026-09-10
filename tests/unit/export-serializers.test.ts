import { describe, expect, it } from 'vitest'
import type { DeidentifiedDataset, DeidentifiedRow } from '@/entities/phase/api/queries'
import { toCsv, toJson, toXlsx } from '@/shared/lib/export'

/**
 * Слой сериализации (docs/export.md §1): тонкие адаптеры поверх одного
 * нейтрального датасета. PII здесь уже нет — инвариант проверяется тем,
 * что вход собирается без запретных ключей, а адаптеры их не добавляют.
 */
const row = (overrides: Record<string, number | null>): DeidentifiedRow =>
  ({
    seq_id: 0,
    registry_version: 1,
    age_group: null,
    gender: null,
    education_level: null,
    career_level: null,
    living_status: null,
    disability_status: null,
    family_history: null,
    personality_type: null,
    phase_order_id: 1,
    phase_start_diff_months: null,
    phase_duration_months: null,
    intermission_duration: null,
    prophylaxis_type: null,
    onset_trigger: null,
    main_component: null,
    ad_efficacy: null,
    hamd_total: null,
    beck_total: null,
    mmse_total: null,
    ...overrides,
  }) as DeidentifiedRow

const dataset = (): DeidentifiedDataset => ({
  columns: [
    'seq_id',
    'registry_version',
    'age_group',
    'gender',
    'phase_order_id',
    'phase_start_diff_months',
  ],
  rows: [
    row({ seq_id: 1, age_group: 2, gender: 1, phase_order_id: 1, phase_start_diff_months: 3 }),
    row({
      seq_id: 2,
      age_group: 3,
      gender: 2,
      phase_order_id: 1,
      phase_start_diff_months: null,
    }),
  ],
  meta: {
    exportedAt: '2026-01-01T00:00:00.000Z',
    k: 5,
    patients: 2,
    rowsTotal: 2,
    rowsExported: 2,
    suppressedRows: 0,
    registryVersions: [1],
  },
})

const FORBIDDEN = ['patient_id', 'birth_year', 'study_entry_date', 'phase_start_date']

/** Точное совпадение токена (не подстрока: seq_id легален, patient_id — нет). */
const tokensOf = (csv: string): string[] => csv.split(/[\r\n,]+/).filter(Boolean)

describe('export serializers: csv/json/xlsx поверх нейтрального датасета', () => {
  it('csv: шапка = columns, NULL — пусто, запретных ключей нет', () => {
    const csv = toCsv(dataset())
    const lines = csv.split('\r\n').filter(Boolean)
    expect(lines[0]).toBe(
      'seq_id,registry_version,age_group,gender,phase_order_id,phase_start_diff_months'
    )
    expect(lines[1]).toBe('1,1,2,1,1,3')
    expect(lines[2]).toBe('2,1,3,2,1,')
    const tokens = tokensOf(csv)
    for (const key of FORBIDDEN) expect(tokens, key).not.toContain(key)
    for (const key of FORBIDDEN) expect(lines[0].split(','), key).not.toContain(key)
  })

  it('json: meta + columns + rows со стабильным порядком ключей', () => {
    const parsed = JSON.parse(toJson(dataset())) as {
      meta: { k: number }
      columns: string[]
      rows: Array<Record<string, number | null>>
    }
    expect(parsed.meta.k).toBe(5)
    expect(parsed.columns[0]).toBe('seq_id')
    expect(Object.keys(parsed.rows[0])).toEqual(parsed.columns)
    expect(JSON.stringify(parsed)).not.toContain('birth_year')
  })

  it('xlsx: сигнатура ZIP (PK), лист содержит шапку и значения', () => {
    const bytes = toXlsx(dataset())
    expect(bytes[0]).toBe(0x50)
    expect(bytes[1]).toBe(0x4b)
    const text = new TextDecoder('utf-8').decode(bytes)
    expect(text).toContain('seq_id')
    expect(text).toContain('phase_start_diff_months')
    expect(text).toContain('<v>3</v>')
    // Запретные имена — как XML-токены <t>name</t>, не как подстроки
    // (seq_id содержит 'id', phase_start_diff_months — 'phase_start_date'-префикс нет).
    for (const key of FORBIDDEN) expect(text, key).not.toContain(`<t>${key}</t>`)
  })
})
