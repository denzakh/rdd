/**
 * Агрегаты по пациентам для /reports (docs/spec-stage-2.md §3).
 *
 * Все запросы уважают:
 *  - правило согласия (consent lifecycle): пациент с consent_withdrawn_at
 *    IS NOT NULL исключён из отчётов/экспорта (та же семантика, что в
 *    entities/phase/api/queries.ts);
 *  - data_scope пользователя (patientScopeWhere — тот же row-level access,
 *    что у списков; documents/export.md §3).
 *
 * Имена колонок зашиты в запросы статически (пол, отягощённость, год
 * рождения) — инъекция через имя поля невозможна, значений — биндинги.
 */
import { PATIENT_SCOPE_ALL, patientScopeWhere, type PatientScope } from './patient-repo'

/** Одна строка распределения: [value, count], NULL не включается. */
export interface ValueCount {
  value: number
  count: number
}

/** Пациент виден в отчётах только при действующем согласии. */
const CONSENT_OK = `consent_withdrawn_at IS NULL`

/** WHERE-фрагмент (consent + scope) и биндинги. */
function patientWhere(scope: PatientScope): { sql: string; binds: unknown[] } {
  const w = patientScopeWhere(scope)
  const conditions = [CONSENT_OK]
  if (w.sql) conditions.push(w.sql)
  return { sql: `WHERE ${conditions.join(' AND ')}`, binds: w.binds }
}

/** Распределение пациентов по полу (patients.gender). */
export async function genderDistribution(
  db: D1Database,
  scope: PatientScope = PATIENT_SCOPE_ALL
): Promise<ValueCount[]> {
  const w = patientWhere(scope)
  const { results } = await db
    .prepare(
      `SELECT gender AS value, COUNT(*) AS count
       FROM patients
       ${w.sql}
       GROUP BY gender
       ORDER BY count DESC, value ASC`
    )
    .bind(...w.binds)
    .all<ValueCount>()
  return results
}

/** Наследственная отягощённость психическими заболеваниями (family_history 0/1). */
export async function familyHistoryDistribution(
  db: D1Database,
  scope: PatientScope = PATIENT_SCOPE_ALL
): Promise<ValueCount[]> {
  const w = patientWhere(scope)
  const { results } = await db
    .prepare(
      `SELECT family_history AS value, COUNT(*) AS count
       FROM patients
       ${w.sql}
       GROUP BY family_history
       ORDER BY count DESC, value ASC`
    )
    .bind(...w.binds)
    .all<ValueCount>()
  return results
}

/**
 * Средний возраст (в полных годах) на момент включения в исследование:
 * год(study_entry_date) − birth_year — та же семантика, что у вычисляемого
 * поля current_age реестра пациента. Учитываются только пациенты
 * с заполненными обеими величинами. stddev — выборочное СКО по возрастам.
 */
export async function averageAgeAtInclusion(
  db: D1Database,
  scope: PatientScope = PATIENT_SCOPE_ALL
): Promise<{ value: number | null; patients: number; stddev: number | null }> {
  const w = patientScopeWhere(scope)
  const conditions = [CONSENT_OK]
  if (w.sql) conditions.push(w.sql)
  const row = await db
    .prepare(
      `SELECT AVG(age) AS value,
              COUNT(age) AS patients,
              SQRT((SUM(age * age) - SUM(age) * SUM(age) / COUNT(age)) /
                   (COUNT(age) - 1)) AS stddev
       FROM (
         SELECT CAST(strftime('%Y', study_entry_date) AS REAL) - birth_year AS age
         FROM patients
         WHERE ${conditions.join(' AND ')}
           AND study_entry_date IS NOT NULL
           AND birth_year IS NOT NULL
       )`
    )
    .bind(...w.binds)
    .first<{ value: number | null; patients: number; stddev: number | null }>()
  return row ?? { value: null, patients: 0, stddev: null }
}
