import { FLAT_REGISTRY } from '@/shared/config'
import type { RegistryField } from '@/shared/config'
import { DATA_COLUMNS } from './phase-repo'

/**
 * Агрегаты по фазам (docs/spec-stage-2.md §3).
 * Имя колонки (fieldId) валидируется по whitelist DATA_COLUMNS и по реестру —
 * защита от SQL-инъекции через имя колонки; значения — только биндинги.
 */

const PHASE_FIELD_IDS = new Set<string>(
  Object.values(FLAT_REGISTRY)
    .filter((f) => (f as RegistryField).scope === 'phase')
    .map((f) => (f as RegistryField).id)
)

export function assertPhaseField(fieldId: string): keyof (typeof DATA_COLUMNS)[number] {
  if (!PHASE_FIELD_IDS.has(fieldId) || !DATA_COLUMNS.includes(fieldId as never)) {
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
       FROM phases WHERE ${String(column)} IS NOT NULL
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
       FROM phases GROUP BY phase_order_id ORDER BY phase_order_id`
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
       WHERE main_component IS NOT NULL AND ad_efficacy IS NOT NULL
       GROUP BY main_component, ad_efficacy
       ORDER BY main_component, ad_efficacy`
    )
    .all<{ main_component: number; ad_efficacy: number; count: number }>()
  return results
}
