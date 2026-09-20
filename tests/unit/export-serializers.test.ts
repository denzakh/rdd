import { describe, expect, it } from 'vitest'
import type { DeidentifiedDataset, DeidentifiedRow } from '@/entities/phase/api/queries'
import { toCsv, toJson, toXlsx } from '@/shared/lib/export'

/**
 * Слой сериализации (docs/ru/export.md §1): тонкие адаптеры поверх одного
 * нейтрального датасета. PII здесь уже нет — инвариант проверяется тем,
 * что вход собирается без запретных ключей, а адаптеры их не добавляют.
 */
const row = (overrides: Record<string, number | null>): DeidentifiedRow =>
  ({
    seq_id: 0,
    registry_version: 1,
    age_at_the_beginning_of_the_phase: null,
    gender: null,
    education_level: null,
    career_level: null,
    living_status: null,
    disability_status: null,
    family_history: null,
    personality_type: null,
    phase_order_id: 1,
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
    'age_at_the_beginning_of_the_phase',
    'gender',
    'phase_order_id',
  ],
  rows: [
    row({ seq_id: 1, age_at_the_beginning_of_the_phase: 44, gender: 1, phase_order_id: 1 }),
    row({
      seq_id: 2,
      age_at_the_beginning_of_the_phase: 49,
      gender: 2,
      phase_order_id: 1,
    }),
  ],
  meta: {
    exportedAt: '2026-01-01T00:00:00.000Z',
    patients: 2,
    rowsTotal: 2,
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
      'seq_id,registry_version,age_at_the_beginning_of_the_phase,gender,phase_order_id'
    )
    expect(lines[1]).toBe('1,1,44,1,1')
    expect(lines[2]).toBe('2,1,49,2,1')
    const tokens = tokensOf(csv)
    for (const key of FORBIDDEN) expect(tokens, key).not.toContain(key)
    for (const key of FORBIDDEN) expect(lines[0].split(','), key).not.toContain(key)
  })

  it('json: meta + columns + rows со стабильным порядком ключей', () => {
    const parsed = JSON.parse(toJson(dataset())) as {
      meta: { rowsTotal: number }
      columns: string[]
      rows: Array<Record<string, number | null>>
    }
    expect(parsed.meta.rowsTotal).toBe(2)
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
    expect(text).toContain('age_at_the_beginning_of_the_phase')
    expect(text).toContain('<v>44</v>')
    // Запретные имена — как XML-токены <t>name</t>, не как подстроки
    // (seq_id содержит 'id', age_at_the_beginning_of_the_phase не содержит дат).
    for (const key of FORBIDDEN) expect(text, key).not.toContain(`<t>${key}</t>`)
  })
})
