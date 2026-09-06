import type { PatientRow } from './rows'

/** Входные данные для создания пациента (хранимые поля, nullable). */
export type PatientInput = Omit<PatientRow, 'id'>

export interface PatientRepository {
  create(input: PatientInput): Promise<number>
  findById(id: number): Promise<PatientRow | null>
  list(): Promise<PatientRow[]>
  update(id: number, patch: Partial<PatientInput>): Promise<void>
  remove(id: number): Promise<void>
}

/** Построение SQL-файлов INSERT/UPDATE по имени колонок строки. */
const STORED_COLUMNS = Object.freeze([
  'study_entry_date',
  'birth_year',
  'gender',
  'education_level',
  'career_level',
  'living_status',
  'disability_status',
  'family_history',
  'personality_type',
] as const)
type StoredColumn = (typeof STORED_COLUMNS)[number]

export function createPatientRepository(db: D1Database): PatientRepository {
  const insert = db.prepare(
    `INSERT INTO patients (${STORED_COLUMNS.join(', ')})
     VALUES (${STORED_COLUMNS.map(() => '?').join(', ')})`
  )
  const selectById = db.prepare('SELECT * FROM patients WHERE id = ?')
  const selectAll = db.prepare('SELECT * FROM patients ORDER BY id')
  const del = db.prepare('DELETE FROM patients WHERE id = ?')

  return {
    async create(input) {
      const res = await insert
        .bind(...STORED_COLUMNS.map((c) => (input as Record<string, unknown>)[c] ?? null))
        .run()
      return Number(res.meta.last_row_id)
    },

    async findById(id) {
      return (await selectById.bind(id).first<PatientRow>()) ?? null
    },

    async list() {
      const { results } = await selectAll.all<PatientRow>()
      return results
    },

    async update(id, patch) {
      const keys = Object.keys(patch) as StoredColumn[]
      if (keys.length === 0) return
      const setSql = keys.map((k) => `${k} = ?`).join(', ')
      await db
        .prepare(`UPDATE patients SET ${setSql} WHERE id = ?`)
        .bind(...keys.map((k) => (patch as Record<string, unknown>)[k] ?? null), id)
        .run()
    },

    async remove(id) {
      await del.bind(id).run()
    },
  }
}
