import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildDesiredTables, generateD1Schema, renderOpSql } from '@/shared/lib/registry/d1-schema'

describe('d1-schema: buildDesiredTables', () => {
  it('системные колонки присутствуют с правильными типами', () => {
    const tables = buildDesiredTables()
    const patients = tables.patients
    const phases = tables.phases

    expect(patients[0]).toEqual({ name: 'id', sqlType: 'INTEGER' })
    expect(phases.slice(0, 3)).toEqual([
      { name: 'id', sqlType: 'INTEGER' },
      { name: 'patient_id', sqlType: 'INTEGER' },
      { name: 'phase_order_id', sqlType: 'INTEGER' },
    ])
  })

  it('BOOLEAN → INTEGER, DATE → TEXT, FLOAT → REAL', () => {
    const tables = buildDesiredTables()
    const byName = (table: 'patients' | 'phases', name: string) =>
      Object.fromEntries(tables[table].map((c) => [c.name, c.sqlType]))[name]

    // birth_year — DATE/INTEGER поля из реестра проверяем по типам реестра:
    // год рождения хранится как INTEGER, даты — TEXT
    expect(byName('patients', 'birth_year')).toBe('INTEGER')
    expect(byName('patients', 'study_entry_date')).toBe('TEXT')
    // фазы: длительность — FLOAT (REAL), hamd_total — INTEGER
    expect(byName('phases', 'phase_duration_months')).toBe('REAL')
    expect(byName('phases', 'hamd_total')).toBe('INTEGER')
  })

  it('вычисляемые поля не порождают колонок', () => {
    const tables = buildDesiredTables()
    const names = new Set(tables.patients.map((c) => c.name))
    // current_age / age_group — вычисляемые (calculate), колонок быть не должно
    expect(names.has('current_age')).toBe(false)
    expect(names.has('age_group')).toBe(false)
  })

  it('колонки согласия — системные метаданные patients (TEXT)', () => {
    const tables = buildDesiredTables()
    const byName = Object.fromEntries(tables.patients.map((c) => [c.name, c.sqlType]))
    expect(byName['consent_version']).toBe('TEXT')
    expect(byName['consent_date']).toBe('TEXT')
    expect(byName['consent_withdrawn_at']).toBe('TEXT')
    // согласие — только в patients, не в phases
    const phaseNames = new Set(tables.phases.map((c) => c.name))
    expect(phaseNames.has('consent_version')).toBe(false)
  })
})

describe('d1-schema: generateD1Schema (DDL)', () => {
  const ddl = generateD1Schema()

  it('содержит обе таблицы с PRIMARY KEY AUTOINCREMENT', () => {
    expect(ddl).toMatch(/CREATE TABLE patients \(/)
    expect(ddl).toMatch(/CREATE TABLE phases \(/)
    expect(ddl).toMatch(/"id" INTEGER PRIMARY KEY AUTOINCREMENT/)
  })

  it('constraints из TABLE_META попадают в DDL', () => {
    expect(ddl).toContain('CHECK ("birth_year" >= 1900)')
    expect(ddl).toContain('UNIQUE ("patient_id", "phase_order_id")')
  })

  it('NOT NULL / REFERENCES для системных колонок фаз', () => {
    expect(ddl).toContain('"patient_id" INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE')
    expect(ddl).toContain('"phase_order_id" INTEGER NOT NULL')
  })

  it('доменные колонки — nullable', () => {
    expect(ddl).toMatch(/"hamd_total" INTEGER NULL/)
  })

  it('колонки согласия попадают в DDL patients как nullable TEXT', () => {
    expect(ddl).toContain('"consent_version" TEXT NULL')
    expect(ddl).toContain('"consent_date" TEXT NULL')
    expect(ddl).toContain('"consent_withdrawn_at" TEXT NULL')
  })
})

describe('d1-schema: renderOpSql', () => {
  it('add → ALTER TABLE ADD COLUMN', () => {
    const sql = renderOpSql({
      kind: 'add',
      table: 'phases',
      column: { name: 'x', sqlType: 'INTEGER' },
    })
    expect(sql).toBe('ALTER TABLE phases ADD COLUMN "x" INTEGER NULL;')
  })

  it('rename → ALTER TABLE RENAME COLUMN', () => {
    const sql = renderOpSql({
      kind: 'rename',
      table: 'patients',
      from: 'a',
      to: 'b',
      sqlType: 'TEXT',
    })
    expect(sql).toBe('ALTER TABLE patients RENAME COLUMN "a" TO "b";')
  })
})

describe('d1-schema: синхронность со снапшотом', () => {
  it('buildDesiredTables() совпадает с migrations/.schema-snapshot.json', () => {
    const snapPath = join(process.cwd(), 'migrations', '.schema-snapshot.json')
    if (!existsSync(snapPath)) return // снапшот появляется после первого gen:d1
    const snapshot = JSON.parse(readFileSync(snapPath, 'utf8')) as {
      version: number
      tables: Record<string, Array<{ name: string; sqlType: string }>>
    }

    const desired = buildDesiredTables()
    for (const table of ['patients', 'phases'] as const) {
      const snapCols = snapshot.tables[table] ?? []
      const desiredByName = Object.fromEntries(desired[table].map((c) => [c.name, c.sqlType]))
      for (const col of snapCols) {
        // каждая колонка снапшота существует в реестре с тем же типом
        expect(desiredByName[col.name], `${table}.${col.name}`).toBe(col.sqlType)
      }
    }
  })
})
