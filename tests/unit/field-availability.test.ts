import { describe, expect, it } from 'vitest'
import { REGISTRY } from '@/shared/config/registry'
import {
  PHASE_RELATIVE_ADMISSION,
  PHASE_RELATIVE_DISCHARGE,
  isFieldDisabledForPhase,
} from '@/shared/lib/registry/field-availability'

/**
 * Фаза 99 — вторая контрольная точка фазы 98, а не самостоятельная фаза:
 * часть полей в 98/99 заблокирована от ввода (disabled, не скрытие строк).
 */
describe('field-availability: блокировки фаз 98/99', () => {
  it('фаза 99: весь блок «Контроль фазы» заблокирован', () => {
    for (const fieldId of Object.keys(REGISTRY.phase)) {
      expect(isFieldDisabledForPhase(fieldId, PHASE_RELATIVE_DISCHARGE)).toBe(true)
    }
  })

  it('фаза 99: точечные поля статуса заблокированы', () => {
    for (const fieldId of ['onset_trigger', 'main_component', 'depression_severity']) {
      expect(isFieldDisabledForPhase(fieldId, PHASE_RELATIVE_DISCHARGE)).toBe(true)
    }
  })

  it('фаза 99: весь блок «Фармакотерапия» и весь блок «Ремиссия» заблокированы', () => {
    for (const fieldId of Object.keys(REGISTRY.therapy)) {
      expect(isFieldDisabledForPhase(fieldId, PHASE_RELATIVE_DISCHARGE)).toBe(true)
    }
    for (const fieldId of Object.keys(REGISTRY.remission)) {
      expect(isFieldDisabledForPhase(fieldId, PHASE_RELATIVE_DISCHARGE)).toBe(true)
    }
  })

  it('фаза 99: остальные поля статуса и шкалы доступны', () => {
    expect(isFieldDisabledForPhase('orientation', PHASE_RELATIVE_DISCHARGE)).toBe(false)
    expect(isFieldDisabledForPhase('hamd_total', PHASE_RELATIVE_DISCHARGE)).toBe(false)
    expect(isFieldDisabledForPhase('beck_total', PHASE_RELATIVE_DISCHARGE)).toBe(false)
  })

  it('фаза 98: заблокирована только «Ремиссия», «Фармакотерапия» доступна', () => {
    for (const fieldId of Object.keys(REGISTRY.therapy)) {
      expect(isFieldDisabledForPhase(fieldId, PHASE_RELATIVE_ADMISSION)).toBe(false)
    }
    for (const fieldId of Object.keys(REGISTRY.remission)) {
      expect(isFieldDisabledForPhase(fieldId, PHASE_RELATIVE_ADMISSION)).toBe(true)
    }
    // Контроль фазы и статус в 98 доступны
    for (const fieldId of Object.keys(REGISTRY.phase)) {
      expect(isFieldDisabledForPhase(fieldId, PHASE_RELATIVE_ADMISSION)).toBe(false)
    }
    expect(isFieldDisabledForPhase('onset_trigger', PHASE_RELATIVE_ADMISSION)).toBe(false)
    expect(isFieldDisabledForPhase('main_component', PHASE_RELATIVE_ADMISSION)).toBe(false)
    expect(isFieldDisabledForPhase('depression_severity', PHASE_RELATIVE_ADMISSION)).toBe(false)
  })

  it('обычные фазы и неизвестный relativeId — ничего не блокируем', () => {
    for (const rel of [1, 2, 3, 97, undefined, null]) {
      expect(isFieldDisabledForPhase('phase_start_date', rel)).toBe(false)
      expect(isFieldDisabledForPhase('onset_trigger', rel)).toBe(false)
      expect(isFieldDisabledForPhase('beta_blockers', rel)).toBe(false)
      expect(isFieldDisabledForPhase('subdepression_const', rel)).toBe(false)
    }
  })
})
