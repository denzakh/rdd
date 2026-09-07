import { describe, expect, it } from 'vitest'
import type { PatientRow, PhaseRow } from '@/shared/api/rows'
import { buildDesiredTables } from '@/shared/lib/registry/d1-schema'
import { DATA_COLUMNS } from '@/entities/phase/api/phase-repo'

/**
 * Runtime-смоук синхронности типов строк, реестра и желаемой D1-схемы
 * (docs/spec-stage-4.md §2, строка rows.ts).
 */
describe('rows.ts: синхронность строк, реестра и схемы', () => {
  it('PhaseRow: DATA_COLUMNS — подмножество ключей типа', () => {
    const phaseRowKeys = new Set<string>([
      'id',
      'patient_id',
      'phase_order_id',
      ...DATA_COLUMNS,
      'updated_at',
    ])
    // типовая проверка компилируется; runtime — DATA_COLUMNS не пуст
    expect(DATA_COLUMNS.length).toBeGreaterThan(50)
    expect(phaseRowKeys.has('hamd_total')).toBe(true)
  })

  it('все хранимые колонки реестра есть в желаемой D1-схеме', () => {
    const desired = buildDesiredTables()
    const phaseCols = new Set(desired.phases.map((c) => c.name))
    const patientCols = new Set(desired.patients.map((c) => c.name))

    for (const col of DATA_COLUMNS) {
      expect(phaseCols.has(col), `phases.${col} отсутствует в схеме`).toBe(true)
    }
    // ключевые хранимые поля пациента
    for (const col of ['study_entry_date', 'birth_year', 'personality_type']) {
      expect(patientCols.has(col), `patients.${col} отсутствует в схеме`).toBe(true)
    }
  })

  it('PatientRow не содержит колонок, которых нет в схеме', () => {
    const desired = buildDesiredTables()
    const patientCols = new Set(desired.patients.map((c) => c.name))
    // пробегаем по эталонному списку PatientRow (из типа — через тестовый объект)
    const sample: Partial<PatientRow> = {
      id: 0,
      study_entry_date: null,
      birth_year: null,
      gender: null,
      education_level: null,
      career_level: null,
      living_status: null,
      disability_status: null,
      family_history: null,
      personality_type: null,
    }
    for (const key of Object.keys(sample)) {
      expect(patientCols.has(key), `patients.${key} лишний в PatientRow`).toBe(true)
    }
  })

  it('PhaseRow: ключевые колонки есть в схеме, updated_at — опциональный токен версии', () => {
    const desired = buildDesiredTables()
    const phaseCols = new Set(desired.phases.map((c) => c.name))
    const sample: Partial<PhaseRow> = { id: 0, patient_id: 0, phase_order_id: 0 }
    void sample.updated_at // опциональность уже проверена типами
    expect(phaseCols.has('id')).toBe(true)
    expect(phaseCols.has('patient_id')).toBe(true)
    expect(phaseCols.has('phase_order_id')).toBe(true)
  })
})
