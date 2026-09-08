import type { PatientRow } from '@/shared/api'

/**
 * Репозиторий пациентов (перенос из shared/api, docs/spec-stage-2.md §2).
 * Доменная сущность слоя entities; shared/api остаётся только инфраструктурой.
 */

/** Входные данные для создания пациента (хранимые поля, nullable). */
export type PatientInput = Omit<PatientRow, 'id'>

export interface PatientRepository {
  create(input: PatientInput): Promise<number>
  findById(id: number): Promise<PatientRow | null>
  list(): Promise<PatientRow[]>
  /** Постраничный список с поиском по id (для /patients). */
  listPage(params: { q?: string; limit: number; offset: number }): Promise<PatientRow[]>
  count(q?: string): Promise<number>
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

/**
 * Текущая версия формы информированного согласия (consent lifecycle).
 * При изменении текста согласия увеличьте версию — старые подписи
 * останутся со своей версией в consent_version.
 */
export const CONSENT_CURRENT_VERSION = 'v1'

export interface ConsentInput {
  version?: string
  /** Дата подписания (ISO-8601), по умолчанию — сегодня. */
  date?: string
}

export interface PatientRepository {
  create(input: PatientInput): Promise<number>
  findById(id: number): Promise<PatientRow | null>
  list(): Promise<PatientRow[]>
  /** Постраничный список с поиском по id (для /patients). */
  listPage(params: { q?: string; limit: number; offset: number }): Promise<PatientRow[]>
  count(q?: string): Promise<number>
  update(id: number, patch: Partial<PatientInput>): Promise<void>
  remove(id: number): Promise<void>
  /** Подписание (или повторное подписание) согласия: снимает отзыв. */
  signConsent(id: number, consent?: ConsentInput): Promise<boolean>
  /** Отзыв согласия (идемпотентно): первый отзыв фиксирует время, данные не удаляются. */
  withdrawConsent(id: number): Promise<boolean>
}

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

    async listPage({ q, limit, offset }) {
      // q — только цифры (id пациента); биндинги, без конкатенации значений.
      const id = q && /^\d+$/.test(q.trim()) ? Number(q.trim()) : null
      const where = id === null ? '' : 'WHERE id = ?'
      const binds = id === null ? [limit, offset] : [id, limit, offset]
      const { results } = await db
        .prepare(`SELECT * FROM patients ${where} ORDER BY id LIMIT ? OFFSET ?`)
        .bind(...binds)
        .all<PatientRow>()
      return results
    },

    async count(q) {
      const id = q && /^\d+$/.test(q.trim()) ? Number(q.trim()) : null
      const where = id === null ? '' : 'WHERE id = ?'
      const row = await db
        .prepare(`SELECT COUNT(*) AS c FROM patients ${where}`)
        .bind(...(id === null ? [] : [id]))
        .first<{ c: number }>()
      return row?.c ?? 0
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

    async signConsent(id, consent) {
      const res = await db
        .prepare(
          `UPDATE patients
           SET consent_version = ?, consent_date = ?, consent_withdrawn_at = NULL
           WHERE id = ?`
        )
        .bind(
          consent?.version ?? CONSENT_CURRENT_VERSION,
          consent?.date ?? new Date().toISOString().slice(0, 10),
          id
        )
        .run()
      return res.meta.changes > 0
    },

    async withdrawConsent(id) {
      // Идемпотентность: время первого отзыва не перезаписывается
      const res = await db
        .prepare(
          `UPDATE patients
           SET consent_withdrawn_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
           WHERE id = ? AND consent_withdrawn_at IS NULL`
        )
        .bind(id)
        .run()
      return res.meta.changes > 0
    },
  }
}
