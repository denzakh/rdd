import { REGISTRY } from '@/shared/config/registry'

/**
 * Семантические номера служебных фаз (дубль констант entities/phase,
 * чтобы shared-слой оставался без зависимости от entities):
 * 98 — «Поступление», 99 — «Выписка».
 */
export const PHASE_RELATIVE_ADMISSION = 98
export const PHASE_RELATIVE_DISCHARGE = 99

/**
 * Доступность полей матрицы по семантическому номеру фазы.
 *
 * Фаза 99 («Выписка») по сути не является фазой, а является второй
 * контрольной точкой фазы 98 («Поступление»). Поэтому ввод в ней ограничен:
 * - 99: заблокирован весь блок «Контроль фазы», поля «Совпадение начала
 *   обострения» (onset_trigger), «Преобладающий компонент депрессии»
 *   (main_component), «Тяжесть депрессии» (depression_severity), весь блок
 *   «Фармакотерапия», весь блок «Ремиссия». Скрыты целиком (ячейка
 *   не рендерится): «Дата начала фазы» (phase_start_date) и
 *   «Эффективность АД» (ad_efficacy, будет определяться по шкалам).
 * - 98: заблокирован весь блок «Ремиссия». Скрыто целиком:
 *   «Эффективность АД» (ad_efficacy, будет определяться по шкалам).
 *
 * Разница «скрыто» vs «заблокировано»:
 * - скрыто (`isFieldHiddenForPhase`) — ячейка не рендерится вообще (пустое
 *   место в колонке данной фазы);
 * - заблокировано (`isFieldDisabledForPhase`) — read-only отображение ячейки.
 * Сетка и история остаются видимыми, ввод невозможен.
 * Используется и в UI (`matrix-grid`), и на сервере (`savePhaseCells`),
 * чтобы прямой вызов API не обходил запрет.
 */

const PHASE_CONTROL_FIELD_IDS = new Set(Object.keys(REGISTRY.phase))
const THERAPY_FIELD_IDS = new Set(Object.keys(REGISTRY.therapy))
const REMISSION_FIELD_IDS = new Set(Object.keys(REGISTRY.remission))

/** Точечные поля блока «Психический статус», недоступные в фазе 99. */
const DISCHARGE_BLOCKED_STATUS_FIELDS: ReadonlySet<string> = new Set([
  'onset_trigger',
  'main_component',
  'depression_severity',
])

/**
 * Заблокировано ли поле для ввода в колонке с данным `phase_relative_id`.
 * `undefined` (старые фазы без номера) — не блокируем, чтобы не ломать
 * доступ к историческим данным.
 */
export function isFieldDisabledForPhase(
  fieldId: string,
  relativeId: number | null | undefined
): boolean {
  if (relativeId === PHASE_RELATIVE_DISCHARGE) {
    return (
      PHASE_CONTROL_FIELD_IDS.has(fieldId) ||
      THERAPY_FIELD_IDS.has(fieldId) ||
      REMISSION_FIELD_IDS.has(fieldId) ||
      DISCHARGE_BLOCKED_STATUS_FIELDS.has(fieldId)
    )
  }
  if (relativeId === PHASE_RELATIVE_ADMISSION) {
    return REMISSION_FIELD_IDS.has(fieldId)
  }
  return false
}

/**
 * Скрыта ли ячейка целиком в колонке с данным `phase_relative_id`
 * (место ячейки остаётся пустым, контрол не рендерится).
 * - 99: «Дата начала фазы» (phase_start_date), «Эффективность АД» (ad_efficacy).
 * - 98: «Эффективность АД» (ad_efficacy).
 */
export function isFieldHiddenForPhase(
  fieldId: string,
  relativeId: number | null | undefined
): boolean {
  if (fieldId === 'ad_efficacy') {
    return relativeId === PHASE_RELATIVE_ADMISSION || relativeId === PHASE_RELATIVE_DISCHARGE
  }
  return relativeId === PHASE_RELATIVE_DISCHARGE && fieldId === 'phase_start_date'
}
