import type { PatientRow, SessionUser } from '@/shared/api'
import { PATIENT_CONSENT_COLUMNS, REGISTRY_CURRENT_VERSION } from '@/shared/lib/registry'

/**
 * Репозиторий пациентов (перенос из shared/api, docs/spec-stage-2.md §2).
 * Доменная сущность слоя entities; shared/api остаётся только инфраструктурой.
 */

/** Входные данные для создания пациента (хранимые поля, nullable). */
export type PatientInput = Omit<PatientRow, 'id' | 'registry_version'> & {
  /** Метка протокола на момент сбора; по умолчанию REGISTRY_CURRENT_VERSION. */
  registry_version?: number
}

/**
 * Row-level access: ширина видимости пациентов для экземпляра репозитория.
 * Репозиторий создаётся УЖЕ ограниченным (createPatientRepository(db, scope)) —
 * все выборки (list/listPage/count/findById) автоматически уважают ограничение,
 * включая findById: иначе список скрыт, а карта открывается по прямой ссылке.
 */
export type PatientScope =
  | { mode: 'all' }
  | { mode: 'site'; siteId: string | null }
  | { mode: 'assigned'; clinicianId: string }

/** Scope по умолчанию — без ограничений (admin, скрипты). */
export const PATIENT_SCOPE_ALL: PatientScope = { mode: 'all' }

/**
 * Отображение пользователя → scope видимости (migrations/0005_data_scope.sql):
 * data_scope='all' → все пациенты; 'site' → пациенты своего центра;
 * 'assigned' → только пациенты, назначенные этому врачу.
 */
export function patientScopeFor(user: SessionUser): PatientScope {
  if (user.dataScope === 'site') return { mode: 'site', siteId: user.siteId }
  if (user.dataScope === 'assigned') return { mode: 'assigned', clinicianId: user.id }
  return PATIENT_SCOPE_ALL
}

/** WHERE-фрагмент и биндинги по scope (условия склеиваются с 'AND' снаружи). */
function scopeWhere(scope: PatientScope): { sql: string; binds: unknown[] } {
  switch (scope.mode) {
    case 'site':
      // Без центра у пользователя — не видно ничего (fail closed).
      return scope.siteId
        ? { sql: 'site_id = ?', binds: [scope.siteId] }
        : { sql: '0 = 1', binds: [] }
    case 'assigned':
      return { sql: 'assigned_clinician_id = ?', binds: [scope.clinicianId] }
    default:
      return { sql: '', binds: [] }
  }
}

/**
 * Публичный доступ к scope-фрагменту для агрегатов /reports
 * (patient-queries.ts) — тот же row-level access, что и у списков репозитория.
 */
export const patientScopeWhere = scopeWhere

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
 * Колонки согласия, записываемые при СОЗДАНИИ карточки (docs/ru/consent.md §1):
 * дата подписания фиксируется автоматически, версия ИС — значением из формы
 * регистрации. `consent_withdrawn_at` сюда НЕ входит: отзыв управляется только
 * signConsent/withdrawConsent.
 */
const CONSENT_INSERT_COLUMNS: readonly string[] = PATIENT_CONSENT_COLUMNS.map((c) => c.name).filter(
  (name) => name !== 'consent_withdrawn_at'
)

/** Сегодняшняя дата (ISO, день) — дата фиксации согласия по умолчанию. */
const todayIsoDate = (): string => new Date().toISOString().slice(0, 10)

/**
 * Текущая версия формы информированного согласия (consent lifecycle).
 * При изменении текста согласия увеличьте версию — старые подписи
 * останутся со своей версией в consent_version. Управление версией, что
 * сознательно НЕ делаем и варианты эскалации — docs/ru/consent.md.
 */
export const CONSENT_CURRENT_VERSION = '1'

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

export function createPatientRepository(
  db: D1Database,
  scope: PatientScope = PATIENT_SCOPE_ALL
): PatientRepository {
  // Колонки создания: хранимые поля реестра + системные site_id/assigned_clinician_id.
  const ASSIGN_COLUMNS = ['site_id', 'assigned_clinician_id'] as const
  const insertColumns = (): string[] => {
    const base: string[] = [...STORED_COLUMNS, ...CONSENT_INSERT_COLUMNS]
    for (const c of ASSIGN_COLUMNS) base.push(c)
    return base
  }

  const del = db.prepare('DELETE FROM patients WHERE id = ?')

  return {
    async create(input) {
      // Присваиваем site/врача только если они заданы во входе (иначе NULL).
      // registry_version — метка протокола на момент сбора (docs/schema-evolution.md §4):
      // проставляется один раз при создании, из REGISTRY_CURRENT_VERSION.
      // Согласие фиксируется в момент включения пациента (docs/ru/consent.md §1):
      // дата подписания — сегодня, версия ИС — из формы регистрации либо текущая.
      const inputRecord = input as unknown as Record<string, unknown>
      const record: Record<string, unknown> = {
        ...inputRecord,
        consent_version:
          (inputRecord.consent_version as string | null | undefined) ?? CONSENT_CURRENT_VERSION,
        consent_date: (inputRecord.consent_date as string | null | undefined) ?? todayIsoDate(),
      }
      const columns: string[] = ['registry_version']
      const values: unknown[] = [
        (record.registry_version as number | null) ?? REGISTRY_CURRENT_VERSION,
      ]
      for (const c of insertColumns()) {
        const v = record[c] ?? null
        if (v === null && !(ASSIGN_COLUMNS as readonly string[]).includes(c)) continue
        columns.push(c)
        values.push(v)
      }
      const res = await db
        .prepare(
          `INSERT INTO patients (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`
        )
        .bind(...values)
        .run()
      return Number(res.meta.last_row_id)
    },

    async findById(id) {
      const w = scopeWhere(scope)
      return (
        (await db
          .prepare(`SELECT * FROM patients WHERE id = ? ${w.sql ? `AND ${w.sql}` : ''}`)
          .bind(id, ...w.binds)
          .first<PatientRow>()) ?? null
      )
    },

    async list() {
      const w = scopeWhere(scope)
      const { results } = await db
        .prepare(`SELECT * FROM patients ${w.sql ? `WHERE ${w.sql}` : ''} ORDER BY id`)
        .bind(...w.binds)
        .all<PatientRow>()
      return results
    },

    async listPage({ q, limit, offset }) {
      // q — только цифры (id пациента); биндинги, без конкатенации значений.
      const id = q && /^\d+$/.test(q.trim()) ? Number(q.trim()) : null
      const w = scopeWhere(scope)
      const conditions = [w.sql, id === null ? '' : 'id = ?'].filter(Boolean)
      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
      const binds = [...w.binds, ...(id === null ? [] : [id]), limit, offset]
      const { results } = await db
        .prepare(`SELECT * FROM patients ${where} ORDER BY id LIMIT ? OFFSET ?`)
        .bind(...binds)
        .all<PatientRow>()
      return results
    },

    async count(q) {
      const id = q && /^\d+$/.test(q.trim()) ? Number(q.trim()) : null
      const w = scopeWhere(scope)
      const conditions = [w.sql, id === null ? '' : 'id = ?'].filter(Boolean)
      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
      const binds = [...w.binds, ...(id === null ? [] : [id])]
      const row = await db
        .prepare(`SELECT COUNT(*) AS c FROM patients ${where}`)
        .bind(...binds)
        .first<{ c: number }>()
      return row?.c ?? 0
    },

    async update(id, patch) {
      // registry_version immutable: метка сбора не меняется задним числом
      // (docs/schema-evolution.md §4) — ключ отбрасывается из патча.
      const { registry_version: _ignored, ...rest } = patch as Record<string, unknown>
      const keys = Object.keys(rest) as StoredColumn[]
      if (keys.length === 0) return
      const setSql = keys.map((k) => `${k} = ?`).join(', ')
      await db
        .prepare(`UPDATE patients SET ${setSql} WHERE id = ?`)
        .bind(...keys.map((k) => (rest as Record<string, unknown>)[k] ?? null), id)
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
        .bind(consent?.version ?? CONSENT_CURRENT_VERSION, consent?.date ?? todayIsoDate(), id)
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
