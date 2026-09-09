import { FLAT_REGISTRY } from '@/shared/config'
import type { RegistryField } from '@/shared/config'
import { diffMonths, getAgeGroup } from '@/shared/lib/intl'
import type { DeidentifiedDataset, DeidentifiedRow } from '@/shared/lib/export'
import { DATA_COLUMNS } from './phase-repo'

/**
 * Агрегаты по фазам (docs/spec-stage-2.md §3).
 * Имя колонки (fieldId) валидируется по whitelist DATA_COLUMNS — защита от
 * SQL-инъекции через имя колонки; значения — только биндинги.
 *
 * DATA_COLUMNS — перечень всех доменных (не системных) колонок таблицы phases
 * (см. phase-repo.ts). Это корректный whitelist «полей фазы»: в него входят и
 * поля из блоков status/therapy без явного `scope`, которые также хранятся в phases.
 */

const PHASE_FIELD_IDS = new Set<string>(DATA_COLUMNS)

/**
 * Правило согласия (consent lifecycle): фазы пациента, отозвавшего согласие
 * (patients.consent_withdrawn_at IS NOT NULL), не участвуют в отчётах/экспорте.
 * Данные при этом не удаляются физически — retention вне рамок текущего этапа.
 * Фрагмент подставляется во все агрегаты ниже (только статический текст).
 */
const EXCLUDE_WITHDRAWN_CONSENT = `
       AND NOT EXISTS (
         SELECT 1 FROM patients p
         WHERE p.id = phases.patient_id AND p.consent_withdrawn_at IS NOT NULL
       )`

export function assertPhaseField(fieldId: string): keyof (typeof DATA_COLUMNS)[number] {
  if (!PHASE_FIELD_IDS.has(fieldId)) {
    throw new Error(`Недопустимое поле фазы: ${fieldId}`)
  }
  return fieldId as keyof (typeof DATA_COLUMNS)[number]
}

/** Распределение значений признака: [{ value, count }] (NULL не включается). */
export async function countByField(
  db: D1Database,
  fieldId: string
): Promise<Array<{ value: number; count: number }>> {
  const column = assertPhaseField(fieldId)
  // column приходит из статического whitelist — конкатенация безопасна
  const { results } = await db
    .prepare(
      `SELECT ${String(column)} AS value, COUNT(*) AS count
       FROM phases WHERE ${String(column)} IS NOT NULL${EXCLUDE_WITHDRAWN_CONSENT}
       GROUP BY ${String(column)} ORDER BY count DESC`
    )
    .all<{ value: number; count: number }>()
  return results
}

/** Средние длительности фаз/интермиссий по номеру фазы. */
export async function phaseDurationsByOrder(
  db: D1Database
): Promise<
  Array<{ phase_order_id: number; patients: number; avg_phase: number; avg_intermission: number }>
> {
  const { results } = await db
    .prepare(
      `SELECT phase_order_id,
              COUNT(*) AS patients,
              AVG(phase_duration_months) AS avg_phase,
              AVG(intermission_duration) AS avg_intermission
       FROM phases
       WHERE patient_id IN (
         SELECT id FROM patients WHERE consent_withdrawn_at IS NULL
       )
       GROUP BY phase_order_id ORDER BY phase_order_id`
    )
    .all<{
      phase_order_id: number
      patients: number
      avg_phase: number
      avg_intermission: number
    }>()
  return results
}

/** Эффективность АД в разрезе основного компонента: [{ main_component, ad_efficacy, count }]. */
export async function efficacyByMainComponent(
  db: D1Database
): Promise<Array<{ main_component: number; ad_efficacy: number; count: number }>> {
  const { results } = await db
    .prepare(
      `SELECT main_component, ad_efficacy, COUNT(*) AS count
       FROM phases
       WHERE main_component IS NOT NULL AND ad_efficacy IS NOT NULL${EXCLUDE_WITHDRAWN_CONSENT}
       GROUP BY main_component, ad_efficacy
       ORDER BY main_component, ad_efficacy`
    )
    .all<{ main_component: number; ad_efficacy: number; count: number }>()
  return results
}
// ---------------------------------------------------------------------------
// Слой агрегации де-идентифицированного датасета (docs/export.md).
// ИНВАРИАНТ: де-идентификация — ЗДЕСЬ, один раз, до любой сериализации
// (csv/json/xlsx). Сериализаторы получают нейтральные TS-объекты и PII
// не фильтруют: новый формат не может забыть маскирование.
//  - id пациента -> seq_id (1..N по order id);
//  - pii:true (study_entry_date, birth_year, phase_start_date) исключены;
//    вместо них age_group (1..5) и phase_start_diff_months (diffMonths
//    от даты включения, не абсолютные даты);
//  - k-anonymity: группы < k подавляются (meta.suppressedRows);
//  - consent_withdrawn_at IS NOT NULL — исключены; scope уважается.
// ---------------------------------------------------------------------------

/** Минимальный размер k-anonymity группы (порог подавления). */
export const K_ANONYMITY_K = 5

/** Ширина видимости экспорта (как PatientScope, но без кросс-импорта сущностей — FSD). */
export type DeidentifiedScope =
  | { mode: 'all' }
  | { mode: 'site'; siteId: string | null }
  | { mode: 'assigned'; clinicianId: string }

/** WHERE-фрагмент + биндинги по scope (склеиваются с AND снаружи). */
function deidentifiedScopeWhere(scope: DeidentifiedScope): { sql: string; binds: unknown[] } {
  switch (scope.mode) {
    case 'site':
      return scope.siteId
        ? { sql: 'p.site_id = ?', binds: [scope.siteId] }
        : { sql: '0 = 1', binds: [] }
    case 'assigned':
      return { sql: 'p.assigned_clinician_id = ?', binds: [scope.clinicianId] }
    default:
      return { sql: '', binds: [] }
  }
}

/** Одна строка де-идентифицированного датасета: см. shared/lib/export/types. */
export type { DeidentifiedDataset, DeidentifiedRow } from '@/shared/lib/export'

/** Фазы для экспорта: DATA_COLUMNS минус pii:true (phase_start_date). */
const EXPORT_PHASE_COLUMNS: string[] = DATA_COLUMNS.filter((c) => {
  const f = (FLAT_REGISTRY as unknown as Record<string, RegistryField | undefined>)[c]
  return f?.pii !== true
})

/** Пациенты для экспорта: scope patient минус pii (study_entry_date, birth_year). */
const PATIENT_EXPORT_COLUMNS: string[] = Object.values(
  FLAT_REGISTRY as unknown as Record<string, RegistryField>
)
  .filter((f) => f.scope === 'patient' && !f.calculate && f.db_type && f.pii !== true)
  .map((f) => f.id)

interface DeidentifiedRawRow {
  patient_id: number
  study_entry_date: string | null
  birth_year: number | null
  phase_order_id: number
  phase_start_date: string | null
  [key: string]: unknown
}

/** Слой агрегации: единственный владелец де-идентификации и k-anonymity. */
export async function getDeidentifiedDataset(
  db: D1Database,
  scope: DeidentifiedScope = { mode: 'all' },
  k: number = K_ANONYMITY_K
): Promise<DeidentifiedDataset> {
  const w = deidentifiedScopeWhere(scope)
  const selectCols = ['p.id AS patient_id', 'p.study_entry_date', 'p.birth_year']
  for (const c of PATIENT_EXPORT_COLUMNS) selectCols.push(`p."${c}"`)
  selectCols.push('ph.phase_order_id', 'ph.phase_start_date')
  for (const c of EXPORT_PHASE_COLUMNS) selectCols.push(`ph."${c}"`)
  const conditions = ['p.consent_withdrawn_at IS NULL']
  if (w.sql) conditions.push(w.sql)
  const { results } = await db
    .prepare(
      `SELECT ${selectCols.join(', ')} FROM patients p ` +
        `JOIN phases ph ON ph.patient_id = p.id ` +
        `WHERE ${conditions.join(' AND ')} ORDER BY p.id, ph.phase_order_id`
    )
    .bind(...w.binds)
    .all<DeidentifiedRawRow>()

  const seqByPatient = new Map<number, number>()
  let seq = 0
  const mapped: DeidentifiedRow[] = results.map((r) => {
    let seqId = seqByPatient.get(r.patient_id)
    if (seqId === undefined) {
      seq += 1
      seqId = seq
      seqByPatient.set(r.patient_id, seqId)
    }
    const age =
      r.birth_year !== null && r.birth_year !== undefined && r.study_entry_date
        ? new Date(r.study_entry_date).getFullYear() - r.birth_year
        : null
    const row = { seq_id: seqId } as unknown as Record<string, number | null>
    row.age_group = age === null || Number.isNaN(age) ? null : getAgeGroup(age)
    for (const c of PATIENT_EXPORT_COLUMNS) row[c] = (r[c] as number | null) ?? null
    row.phase_order_id = r.phase_order_id
    row.phase_start_diff_months =
      r.study_entry_date && r.phase_start_date
        ? diffMonths(r.study_entry_date, r.phase_start_date)
        : null
    for (const c of EXPORT_PHASE_COLUMNS) row[c] = (r[c] as number | null) ?? null
    return row as unknown as DeidentifiedRow
  })

  const keyOf = (r: DeidentifiedRow): string =>
    JSON.stringify([r.age_group, r.gender, r.phase_order_id])
  const sizes = new Map<string, number>()
  for (const r of mapped) {
    const key = keyOf(r)
    sizes.set(key, (sizes.get(key) ?? 0) + 1)
  }
  const rows = mapped.filter((r) => (sizes.get(keyOf(r)) ?? 0) >= k)

  const columns = [
    'seq_id',
    'age_group',
    ...PATIENT_EXPORT_COLUMNS,
    'phase_order_id',
    'phase_start_diff_months',
    ...EXPORT_PHASE_COLUMNS,
  ]

  return {
    rows,
    columns,
    meta: {
      exportedAt: new Date().toISOString(),
      k,
      patients: seqByPatient.size,
      rowsTotal: mapped.length,
      rowsExported: rows.length,
      suppressedRows: mapped.length - rows.length,
    },
  }
}
