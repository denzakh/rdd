import type { PhaseRow } from './rows'

/**
 * Входные данные для создания фазы. Все клинические колонки опциональны —
 * незаполненные сохраняются как NULL. patient_id обязателен.
 */
export type PhaseInput = {
  patient_id: number
  phase_order_id?: number
  [key: string]: unknown
}

export interface PhaseRepository {
  create(input: PhaseInput): Promise<number>
  listByPatient(patientId: number): Promise<PhaseRow[]>
  findById(id: number): Promise<PhaseRow | null>
  update(id: number, patch: Partial<PhaseInput>): Promise<void>
  remove(id: number): Promise<void>
}

/**
 * Колонки фаз, кроме системных (id, patient_id, phase_order_id).
 * Генерируется из текущей схемы; при изменениях синхронизируйте с rows.ts.
 */
const DATA_COLUMNS: Array<keyof PhaseRow> = [
  'phase_start_date',
  'phase_duration_months',
  'intermission_duration',
  'subdepression_const',
  'affective_lability_rem',
  'anxiety_lability_rem',
  'unfavorable_env',
  'pain_in_remission',
  'treatment_in_remission',
  'prophylaxis_type',
  'onset_trigger',
  'main_component',
  'orientation',
  'melancholy_obj',
  'anxiety_obj',
  'apathy_obj',
  'sleep_worsening',
  'appetite_loss',
  'cognitive_impair',
  'physical_pain',
  'fatigue',
  'fixed_posture',
  'mimic_poverty',
  'monotonous_voice',
  'motor_retardation',
  'delayed_response',
  'restlessness',
  'affect_lability',
  'motor_agitation',
  'hygiene_decline',
  'diurnal_rhythm',
  'hypochondria',
  'hallucinations',
  'delusions',
  'obsessions',
  'insight',
  'beta_blockers',
  'ca_blockers',
  'other_depressogenic',
  'vitamins',
  'vascular_drugs',
  'nootropics',
  'mood_stabilizers',
  'ad_tricyclic',
  'ad_tetracyclic',
  'ad_other_noradr',
  'ad_serotonergic',
  'ad_snri',
  'ad_maoi',
  'ad_atypical_mech',
  'ad_transitional',
  'ad_dose_level',
  'ad_route',
  'days_to_improvement',
  'total_days',
  'ad_efficacy',
  'ad_switch',
  'switch_reason',
  'nl_typical',
  'nl_atypical',
  'nl_dose_level',
  'trank_benzodiazep',
  'trank_barbiturates',
  'trank_other_chem',
  'trank_herbal',
  'hypnotics',
  'trank_dose_level',
  'trank_route',
  'trank_efficacy',
  'hamd_total',
  'beck_total',
  'clock_drawing_test',
  'mmse_total',
]

/**
 * Назначение следующего phase_order_id для пациента.
 * Если фаз нет — 1, иначе max+1.
 */
async function nextOrderId(db: D1Database, patientId: number): Promise<number> {
  const row = await db
    .prepare('SELECT MAX(phase_order_id) AS m FROM phases WHERE patient_id = ?')
    .bind(patientId)
    .first<{ m: number | null }>()
  return (row?.m ?? 0) + 1
}

export function createPhaseRepository(db: D1Database): PhaseRepository {
  const selectById = db.prepare('SELECT * FROM phases WHERE id = ?')
  const selectByPatient = db.prepare(
    'SELECT * FROM phases WHERE patient_id = ? ORDER BY phase_order_id'
  )
  const del = db.prepare('DELETE FROM phases WHERE id = ?')

  return {
    async create(input) {
      const orderId = await nextOrderId(db, input.patient_id)
      const values = [
        input.patient_id,
        orderId,
        ...DATA_COLUMNS.map((c) => (input as Record<string, unknown>)[c] ?? null),
      ]
      const placeholders = DATA_COLUMNS.map(() => '?').join(', ')
      const res = await db
        .prepare(
          `INSERT INTO phases (patient_id, phase_order_id, ${DATA_COLUMNS.join(', ')})
           VALUES (?, ?, ${placeholders})`
        )
        .bind(...values)
        .run()
      return Number(res.meta.last_row_id)
    },

    async listByPatient(patientId) {
      const { results } = await selectByPatient.bind(patientId).all<PhaseRow>()
      return results
    },

    async findById(id) {
      return (await selectById.bind(id).first<PhaseRow>()) ?? null
    },

    async update(id, patch) {
      const allowed = new Set<string>(['phase_order_id', ...DATA_COLUMNS])
      const keys = Object.keys(patch).filter((k) => allowed.has(k))
      if (keys.length === 0) return
      const setSql = keys.map((k) => `${k} = ?`).join(', ')
      await db
        .prepare(`UPDATE phases SET ${setSql} WHERE id = ?`)
        .bind(...keys.map((k) => (patch as Record<string, unknown>)[k] ?? null), id)
        .run()
    },

    async remove(id) {
      await del.bind(id).run()
    },
  }
}
