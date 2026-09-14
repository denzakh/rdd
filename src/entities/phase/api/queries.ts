import { FLAT_REGISTRY } from '@/shared/config'
import type { RegistryField } from '@/shared/config'
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

/**
 * Распределение значений признака: [{ value, count }] (NULL не включается).
 * count — число РАЗНЫХ пациентов (не фаз): семантика «сколько пациентов
 * с признаком X» (spec-stage-2.md §3). Агрегаты /reports уважают data_scope
 * пользователя (тот же row-level access, что у списков, — export.md §3).
 */
export async function countByField(
  db: D1Database,
  fieldId: string,
  scope: DeidentifiedScope = { mode: 'all' }
): Promise<Array<{ value: number; count: number }>> {
  const column = assertPhaseField(fieldId)
  const s = scopeSqlForPhases(scope)
  // column приходит из статического whitelist — конкатенация безопасна
  const { results } = await db
    .prepare(
      `SELECT ${String(column)} AS value, COUNT(DISTINCT patient_id) AS count
       FROM phases
       WHERE ${String(column)} IS NOT NULL${EXCLUDE_WITHDRAWN_CONSENT}${s.sql}
       GROUP BY ${String(column)}
       ORDER BY count DESC, value ASC`
    )
    .bind(...s.binds)
    .all<{ value: number; count: number }>()
  return results
}

/**
 * Средние длительности фаз/интермиссий по номеру фазы. patients — число РАЗНЫХ
 * пациентов; scope уважается.
 */
export async function phaseDurationsByOrder(
  db: D1Database,
  scope: DeidentifiedScope = { mode: 'all' }
): Promise<
  Array<{ phase_order_id: number; patients: number; avg_phase: number; avg_intermission: number }>
> {
  const s = scopeSqlForPhases(scope)
  const { results } = await db
    .prepare(
      `SELECT phase_order_id,
              COUNT(DISTINCT patient_id) AS patients,
              AVG(phase_duration_months) AS avg_phase,
              AVG(intermission_duration) AS avg_intermission
       FROM phases
       WHERE patient_id IN (
         SELECT id FROM patients WHERE consent_withdrawn_at IS NULL
       )${s.sql}
       GROUP BY phase_order_id
       ORDER BY phase_order_id`
    )
    .bind(...s.binds)
    .all<{
      phase_order_id: number
      patients: number
      avg_phase: number
      avg_intermission: number
    }>()
  return results
}

/**
 * Эффективность АД в разрезе основного компонента. count — число РАЗНЫХ
 * пациентов; scope уважается.
 */
export async function efficacyByMainComponent(
  db: D1Database,
  scope: DeidentifiedScope = { mode: 'all' }
): Promise<Array<{ main_component: number; ad_efficacy: number; count: number }>> {
  const s = scopeSqlForPhases(scope)
  const { results } = await db
    .prepare(
      `SELECT main_component, ad_efficacy, COUNT(DISTINCT patient_id) AS count
       FROM phases
       WHERE main_component IS NOT NULL AND ad_efficacy IS NOT NULL${EXCLUDE_WITHDRAWN_CONSENT}${s.sql}
       GROUP BY main_component, ad_efficacy
       ORDER BY main_component, ad_efficacy`
    )
    .bind(...s.binds)
    .all<{ main_component: number; ad_efficacy: number; count: number }>()
  return results
}
// ---------------------------------------------------------------------------
// Дополнительные показатели /reports (по фазам).
// Семантика count: в распределениях (severity/season/component) — число ФАЗ
// (эпизодов), т.к. каждый эпизод характеризуется своей тяжестью/компонентом
// и датой начала. Запросы используют только статические колонки и биндинги.
// ---------------------------------------------------------------------------

export interface AverageStat {
  /** Средняя величина (в годах/месяцах) или null, если корректных строк нет. */
  value: number | null
  /**
   * Выборочное среднее квадратичное отклонение (знаменатель n−1) той же
   * величины; null, если учтённых строк меньше двух.
   */
  stddev: number | null
  /** Число учтённых пациентов (или строк для средних по фазам). */
  patients: number
}

/**
 * Средний возраст начала заболевания (в годах): пациент учитывается по своей
 * ПЕРВОЙ фазе (phase_order_id = 1), возраст = год(phase_start_date) − birth_year.
 * stddev — выборочное СКО по возрастам пациентов.
 */
export async function averageOnsetAge(
  db: D1Database,
  scope: DeidentifiedScope = { mode: 'all' }
): Promise<AverageStat> {
  const s = scopeSqlForPhases(scope)
  const { results } = await db
    .prepare(
      `SELECT AVG(age) AS value,
              COUNT(age) AS patients,
              SQRT((SUM(age * age) - SUM(age) * SUM(age) / COUNT(age)) /
                   (COUNT(age) - 1)) AS stddev
       FROM (
         SELECT CAST(strftime('%Y', ph.phase_start_date) AS REAL) - p.birth_year AS age
         FROM phases ph
         JOIN patients p ON p.id = ph.patient_id
         WHERE ph.phase_order_id = 1
           AND ph.phase_start_date IS NOT NULL
           AND p.birth_year IS NOT NULL
           AND p.consent_withdrawn_at IS NULL${s.sql}
       )`
    )
    .bind(...s.binds)
    .all<AverageStat>()
  return results[0] ?? { value: null, patients: 0, stddev: null }
}

/**
 * Средняя длительность заболевания в месяцах: для каждого пациента
 * суммируются длительности всех фаз и интермиссий, затем — среднее
 * по пациентам с ненулевой накопленной длительностью.
 * stddev — выборочное СКО по накопленным длительностям пациентов.
 */
export async function averageDiseaseDurationMonths(
  db: D1Database,
  scope: DeidentifiedScope = { mode: 'all' }
): Promise<AverageStat> {
  const s = scopeSqlForPhases(scope)
  const { results } = await db
    .prepare(
      `SELECT AVG(total) AS value,
              COUNT(total) AS patients,
              SQRT((SUM(total * total) - SUM(total) * SUM(total) / COUNT(total)) /
                   (COUNT(total) - 1)) AS stddev
       FROM (
         SELECT ph.patient_id,
                SUM(COALESCE(ph.phase_duration_months, 0)) +
                  SUM(COALESCE(ph.intermission_duration, 0)) AS total
         FROM phases ph
         WHERE ph.patient_id IN (SELECT p.id FROM patients p
                                 WHERE p.consent_withdrawn_at IS NULL)${s.sql}
         GROUP BY ph.patient_id
       )
       WHERE total > 0`
    )
    .bind(...s.binds)
    .all<AverageStat>()
  return results[0] ?? { value: null, patients: 0, stddev: null }
}

/** Средние длительности фаз и интермиссий по всем эпизодам (в месяцах). */
export interface AverageDurations {
  avgPhaseMonths: number | null
  avgIntermissionMonths: number | null
  /** Число фаз с заполненной длительностью фазы. */
  phaseRows: number
  /** Число фаз с заполненной длительностью интермиссии. */
  intermissionRows: number
  /** Выборочное СКО длительности фаз, мес (null, если фаз < 2). */
  stddevPhaseMonths: number | null
  /** Выборочное СКО длительности интермиссий, мес (null, если интермиссий < 2). */
  stddevIntermissionMonths: number | null
}

export async function averageDurations(
  db: D1Database,
  scope: DeidentifiedScope = { mode: 'all' }
): Promise<AverageDurations> {
  const s = scopeSqlForPhases(scope)
  const { results } = await db
    .prepare(
      `SELECT AVG(phase_duration_months) AS avg_phase,
              AVG(intermission_duration) AS avg_intermission,
              COUNT(phase_duration_months) AS phase_rows,
              COUNT(intermission_duration) AS intermission_rows,
              SQRT((SUM(phase_duration_months * phase_duration_months) -
                      SUM(phase_duration_months) * SUM(phase_duration_months) /
                      COUNT(phase_duration_months)) / (COUNT(phase_duration_months) - 1))
                AS phase_stddev,
              SQRT((SUM(intermission_duration * intermission_duration) -
                      SUM(intermission_duration) * SUM(intermission_duration) /
                      COUNT(intermission_duration)) / (COUNT(intermission_duration) - 1))
                AS intermission_stddev
       FROM phases
       WHERE patient_id IN (SELECT p.id FROM patients p
                            WHERE p.consent_withdrawn_at IS NULL)${s.sql}`
    )
    .bind(...s.binds)
    .all<{
      avg_phase: number | null
      avg_intermission: number | null
      phase_rows: number
      intermission_rows: number
      phase_stddev: number | null
      intermission_stddev: number | null
    }>()
  const r = results[0]
  return {
    avgPhaseMonths: r?.avg_phase ?? null,
    avgIntermissionMonths: r?.avg_intermission ?? null,
    phaseRows: r?.phase_rows ?? 0,
    intermissionRows: r?.intermission_rows ?? 0,
    stddevPhaseMonths: r?.phase_stddev ?? null,
    stddevIntermissionMonths: r?.intermission_stddev ?? null,
  }
}
/** Динамика «первый → предпоследний» (длительности фаз/интермиссий). */
export interface FirstToPenultimate {
  /** Средняя длительность первой фазы/интермиссии, мес. */
  firstAvg: number | null
  /** Средняя длительность предпоследней фазы/интермиссии, мес. */
  penultimateAvg: number | null
  /** firstAvg / penultimateAvg (null, если одна из средних недоступна). */
  ratio: number | null
  /** Число пациентов с минимум 3 фазами (по ним осмысленна «предпоследняя»). */
  patients: number
}

/** Динамика длительности ФАЗ: первая фаза против предпоследней. */
export async function firstToPenultimatePhaseDuration(
  db: D1Database,
  scope: DeidentifiedScope = { mode: 'all' }
): Promise<FirstToPenultimate> {
  return firstToPenultimateOfColumn(db, 'phase_duration_months', scope)
}

/** Динамика длительности ИНТЕРМИССИЙ: первая против предпоследней. */
export async function firstToPenultimateIntermissionDuration(
  db: D1Database,
  scope: DeidentifiedScope = { mode: 'all' }
): Promise<FirstToPenultimate> {
  return firstToPenultimateOfColumn(db, 'intermission_duration', scope)
}

/**
 * Сравнение 1-го и предпоследнего эпизода по пациентам с минимум 3 фазами.
 * «Первая» = ранг 1 по phase_order_id, «предпоследняя» = ранг n−1 (n — число
 * фаз пациента). Имя колонки — только константа из двух литералов
 * (инъекция невозможна); вывод о динамике: ratio > 1 — укорочение,
 * ratio < 1 — удлинение (см. statistics-panel.tsx).
 */
async function firstToPenultimateOfColumn(
  db: D1Database,
  column: 'phase_duration_months' | 'intermission_duration',
  scope: DeidentifiedScope
): Promise<FirstToPenultimate> {
  const s = scopeSqlForPhases(scope)
  const { results } = await db
    .prepare(
      `WITH ordered AS (
         SELECT patient_id, ${column},
                ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY phase_order_id) AS rn,
                COUNT(*) OVER (PARTITION BY patient_id) AS total
         FROM phases
         WHERE patient_id IN (SELECT p.id FROM patients p
                              WHERE p.consent_withdrawn_at IS NULL)${s.sql}
       )
       SELECT AVG(CASE WHEN rn = 1 THEN ${column} END) AS first_avg,
              AVG(CASE WHEN rn = total - 1 THEN ${column} END) AS penultimate_avg,
              COUNT(DISTINCT patient_id) AS patients
       FROM ordered
       WHERE total >= 3`
    )
    .bind(...s.binds)
    .all<{ first_avg: number | null; penultimate_avg: number | null; patients: number }>()
  const r = results[0]
  const firstAvg = r?.first_avg ?? null
  const penultimateAvg = r?.penultimate_avg ?? null
  const ratio =
    firstAvg !== null && penultimateAvg !== null && penultimateAvg > 0
      ? firstAvg / penultimateAvg
      : null
  return { firstAvg, penultimateAvg, ratio, patients: r?.patients ?? 0 }
}
/** Сезон начала обострения: 1 — зима, 2 — весна, 3 — лето, 4 — осень. */
export interface SeasonCount {
  season: number
  count: number
}

/** Распределение начал фаз (обострений) по сезонам года (число фаз). */
export async function seasonalDistribution(
  db: D1Database,
  scope: DeidentifiedScope = { mode: 'all' }
): Promise<SeasonCount[]> {
  const s = scopeSqlForPhases(scope)
  const { results } = await db
    .prepare(
      `SELECT CASE CAST(strftime('%m', phase_start_date) AS INTEGER)
                WHEN 12 THEN 1 WHEN 1 THEN 1 WHEN 2 THEN 1
                WHEN 3 THEN 2 WHEN 4 THEN 2 WHEN 5 THEN 2
                WHEN 6 THEN 3 WHEN 7 THEN 3 WHEN 8 THEN 3
                WHEN 9 THEN 4 WHEN 10 THEN 4 WHEN 11 THEN 4
                ELSE 0 END AS season_code,
              COUNT(*) AS count
       FROM phases
       WHERE phase_start_date IS NOT NULL
         AND patient_id IN (SELECT p.id FROM patients p
                            WHERE p.consent_withdrawn_at IS NULL)${s.sql}
       GROUP BY season_code
       ORDER BY season_code`
    )
    .bind(...s.binds)
    .all<{ season_code: number; count: number }>()
  return results
    .filter((r) => r.season_code > 0)
    .map((r) => ({ season: r.season_code, count: r.count }))
}

/**
 * Тяжесть депрессии по HAM-D: распределение ФАЗ по hamd_severity
 * (2 — лёгкая, 3 — умеренная, 4 — тяжёлая). Категория 1 («Отсутствует»,
 * ≤7 баллов) не входит в запрошенные категории — отфильтровывается здесь.
 */
export async function depressionSeverityDistribution(
  db: D1Database,
  scope: DeidentifiedScope = { mode: 'all' }
): Promise<Array<{ value: number; count: number }>> {
  const s = scopeSqlForPhases(scope)
  const { results } = await db
    .prepare(
      `SELECT patient_id, hamd_total
       FROM phases
       WHERE hamd_total IS NOT NULL
         AND patient_id IN (SELECT p.id FROM patients p
                            WHERE p.consent_withdrawn_at IS NULL)${s.sql}`
    )
    .bind(...s.binds)
    .all<{ patient_id: number; hamd_total: number }>()

  const field = (FLAT_REGISTRY as unknown as Record<string, RegistryField>).hamd_severity
  const severityOf = field?.calculate
  const counts = new Map<number, number>()
  for (const r of results) {
    const severity = severityOf ? Number(severityOf({ hamd_total: r.hamd_total }) ?? 0) : 0
    if (severity < 2) continue
    counts.set(severity, (counts.get(severity) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([value, count]: [number, number]) => ({ value, count }))
    .sort((a, b) => a.value - b.value)
}

/** Преобладающий компонент депрессии: распределение ФАЗ по main_component. */
export async function mainComponentDistribution(
  db: D1Database,
  scope: DeidentifiedScope = { mode: 'all' }
): Promise<Array<{ value: number; count: number }>> {
  const s = scopeSqlForPhases(scope)
  const { results } = await db
    .prepare(
      `SELECT main_component AS value, COUNT(*) AS count
       FROM phases
       WHERE main_component IS NOT NULL
         AND patient_id IN (SELECT p.id FROM patients p
                            WHERE p.consent_withdrawn_at IS NULL)${s.sql}
       GROUP BY main_component
       ORDER BY count DESC, value ASC`
    )
    .bind(...s.binds)
    .all<{ value: number; count: number }>()
  return results
}
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Слой агрегации де-идентифицированного датасета (docs/export.md).
// ИНВАРИАНТ: де-идентификация — ЗДЕСЬ, один раз, до любой сериализации
// (csv/json/xlsx). Сериализаторы получают нейтральные TS-объекты и PII
// не фильтруют: новый формат не может забыть маскирование.
//  - id пациента -> seq_id (1..N по order id);
//  - pii:true (study_entry_date, birth_year, phase_start_date) исключены;
//    вместо них age_at_the_beginning_of_the_phase (возраст пациента
//    на момент начала фазы в полных годах; не абсолютные даты);
//  - consent_withdrawn_at IS NOT NULL — исключены; scope уважается.
// ---------------------------------------------------------------------------

/** Ширина видимости экспорта (как PatientScope, но без кросс-импорта сущностей — FSD). */
export type DeidentifiedScope =
  | { mode: 'all' }
  | { mode: 'site'; siteId: string | null }
  | { mode: 'assigned'; clinicianId: string }

/**
 * WHERE-фрагмент + биндинги по scope (склеиваются с AND снаружи).
 * alias — псевдоним таблицы patients, за которым лежат scope-колонки
 * site_id / assigned_clinician_id (migrations/0005_data_scope.sql).
 * Fail closed: 'site' без центра ничего не видит.
 */
function scopeWhereOnPatient(
  scope: DeidentifiedScope,
  alias: string
): { sql: string; binds: unknown[] } {
  switch (scope.mode) {
    case 'site':
      return scope.siteId
        ? { sql: `${alias}.site_id = ?`, binds: [scope.siteId] }
        : { sql: '0 = 1', binds: [] }
    case 'assigned':
      return { sql: `${alias}.assigned_clinician_id = ?`, binds: [scope.clinicianId] }
    default:
      return { sql: '', binds: [] }
  }
}

/**
 * Scope-условие для агрегатов, идущих FROM phases: фильтруем по пациенту
 * вложенным подзапросом p (тот же row-level access, что у списков). Возвращает
 * фрагмент, вставляемый в WHERE (с ведущим AND), и биндинги.
 */
function scopeSqlForPhases(scope: DeidentifiedScope): { sql: string; binds: unknown[] } {
  const w = scopeWhereOnPatient(scope, 'p')
  if (!w.sql) return { sql: '', binds: [] }
  return { sql: ` AND patient_id IN (SELECT p.id FROM patients p WHERE ${w.sql})`, binds: w.binds }
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
  birth_year: number | null
  phase_order_id: number
  phase_start_date: string | null
  registry_version: number | null
  [key: string]: unknown
}

/** Слой агрегации: единственный владелец де-идентификации. */
export async function getDeidentifiedDataset(
  db: D1Database,
  scope: DeidentifiedScope = { mode: 'all' }
): Promise<DeidentifiedDataset> {
  const w = scopeWhereOnPatient(scope, 'p')
  const selectCols = ['p.id AS patient_id', 'p.birth_year']
  for (const c of PATIENT_EXPORT_COLUMNS) selectCols.push(`p."${c}"`)
  selectCols.push('ph.phase_order_id', 'ph.phase_start_date', 'ph.registry_version')
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
    // Возраст пациента (полных лет) на момент начала фазы: вместо абсолютной
    // даты (phase_start_date — pii) в выгрузку попадает только возраст.
    const ageAtPhaseStart =
      r.birth_year !== null && r.birth_year !== undefined && r.phase_start_date
        ? new Date(r.phase_start_date).getFullYear() - r.birth_year
        : null
    const row = { seq_id: seqId } as unknown as Record<string, number | null>
    row.age_at_the_beginning_of_the_phase =
      ageAtPhaseStart === null || Number.isNaN(ageAtPhaseStart)
        ? null
        : Math.max(0, ageAtPhaseStart)
    // Метка версии протокола на строке (docs/schema-evolution.md §6): NOT NULL в схеме.
    row.registry_version = (r.registry_version as number | null) ?? 1
    for (const c of PATIENT_EXPORT_COLUMNS) row[c] = (r[c] as number | null) ?? null
    row.phase_order_id = r.phase_order_id
    for (const c of EXPORT_PHASE_COLUMNS) row[c] = (r[c] as number | null) ?? null
    return row as unknown as DeidentifiedRow
  })

  const columns = [
    'seq_id',
    'registry_version',
    'age_at_the_beginning_of_the_phase',
    ...PATIENT_EXPORT_COLUMNS,
    'phase_order_id',
    ...EXPORT_PHASE_COLUMNS,
  ]

  return {
    rows: mapped,
    columns,
    meta: {
      exportedAt: new Date().toISOString(),
      patients: seqByPatient.size,
      rowsTotal: mapped.length,
      registryVersions: [...new Set(mapped.map((r) => r.registry_version))].sort((a, b) => a - b),
    },
  }
}
