import { PATIENT_REGISTRY } from './patient'
import { PHASE_CONTROL_REGISTRY } from './phase'
import { REMISSION_REGISTRY } from './remission'
import { MENTAL_STATUS_REGISTRY } from './status'
import { THERAPY_REGISTRY, THERAPY_GROUPS } from './therapy'
import { DIAGNOSTIC_SCALES_REGISTRY } from './scales'

// Группированный объект для UI и логики разделов
export const REGISTRY = {
  patient: PATIENT_REGISTRY,
  phase: PHASE_CONTROL_REGISTRY,
  remission: REMISSION_REGISTRY,
  status: MENTAL_STATUS_REGISTRY,
  therapy: THERAPY_REGISTRY,
  diagnostic: DIAGNOSTIC_SCALES_REGISTRY,
} as const

// Плоский объект для быстрого поиска по ID (например, при валидации API)
export const FLAT_REGISTRY = {
  ...PATIENT_REGISTRY,
  ...PHASE_CONTROL_REGISTRY,
  ...REMISSION_REGISTRY,
  ...MENTAL_STATUS_REGISTRY,
  ...THERAPY_REGISTRY,
  ...DIAGNOSTIC_SCALES_REGISTRY,
} as const

// Словарь подгрупп фармакотерапии (subheader в матрице, группировка словаря)
export { THERAPY_GROUPS }

export type AppRegistry = typeof REGISTRY
