import type { PATIENT_REGISTRY } from '@/shared/config/registry/patient'
import type { PHASE_CONTROL_REGISTRY } from '@/shared/config/registry/phase'

/**
 * Типы строк БД.
 *
 * ВАЖНО: эти типы заданы явно и должны совпадать с фактической схемой D1
 * (`migrations/0001_init.sql`), которая генерируется из реестра.
 * При добавлении/переименовании полей реестра обновите и эти типы,
 * `npm run gen:d1`, затем пересоздайте локальную БД (`npm run db:restart`).
 */
export type PatientRow = {
  id: number
  study_entry_date: string | null
  birth_year: number | null
  gender: number | null
  education_level: number | null
  career_level: number | null
  living_status: number | null
  disability_status: number | null
  family_history: number | null
  personality_type: number | null
}

export type PhaseRow = {
  id: number
  patient_id: number
  phase_order_id: number
  phase_start_date: string | null
  phase_duration_months: number | null
  intermission_duration: number | null
  subdepression_const: number | null
  affective_lability_rem: number | null
  anxiety_lability_rem: number | null
  unfavorable_env: number | null
  pain_in_remission: number | null
  treatment_in_remission: number | null
  prophylaxis_type: number | null
  onset_trigger: number | null
  main_component: number | null
  orientation: number | null
  melancholy_obj: number | null
  anxiety_obj: number | null
  apathy_obj: number | null
  sleep_worsening: number | null
  appetite_loss: number | null
  cognitive_impair: number | null
  physical_pain: number | null
  fatigue: number | null
  fixed_posture: number | null
  mimic_poverty: number | null
  monotonous_voice: number | null
  motor_retardation: number | null
  delayed_response: number | null
  restlessness: number | null
  affect_lability: number | null
  motor_agitation: number | null
  hygiene_decline: number | null
  diurnal_rhythm: number | null
  hypochondria: number | null
  hallucinations: number | null
  delusions: number | null
  obsessions: number | null
  insight: number | null
  beta_blockers: number | null
  ca_blockers: number | null
  other_depressogenic: number | null
  vitamins: number | null
  vascular_drugs: number | null
  nootropics: number | null
  mood_stabilizers: number | null
  ad_tricyclic: number | null
  ad_tetracyclic: number | null
  ad_other_noradr: number | null
  ad_serotonergic: number | null
  ad_snri: number | null
  ad_maoi: number | null
  ad_atypical_mech: number | null
  ad_transitional: number | null
  ad_dose_level: number | null
  ad_route: number | null
  days_to_improvement: number | null
  total_days: number | null
  ad_efficacy: number | null
  ad_switch: number | null
  switch_reason: number | null
  nl_typical: number | null
  nl_atypical: number | null
  nl_dose_level: number | null
  trank_benzodiazep: number | null
  trank_barbiturates: number | null
  trank_other_chem: number | null
  trank_herbal: number | null
  hypnotics: number | null
  trank_dose_level: number | null
  trank_route: number | null
  trank_efficacy: number | null
  hamd_total: number | null
  beck_total: number | null
  clock_drawing_test: number | null
  mmse_total: number | null
}

// Типовая страховка от рассинхрона: хранимое поле реестра `patients`,
// не являющееся вычисляемым, обязано присутствовать как ключ в PatientRow.
type _PatientsSync = {
  [K in keyof typeof PATIENT_REGISTRY as (typeof PATIENT_REGISTRY)[K] extends {
    calculate?: any
  }
    ? never
    : K]: PatientRow
}
declare const _patientsSync: _PatientsSync
// Хранимые поля фаз (scope 'phase') обязаны быть ключами в PhaseRow.
type _PhasesSync = {
  [K in keyof typeof PHASE_CONTROL_REGISTRY as K extends keyof PhaseRow ? K : never]: PhaseRow
}
declare const _phasesSync: _PhasesSync