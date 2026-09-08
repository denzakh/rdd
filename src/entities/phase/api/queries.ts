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
