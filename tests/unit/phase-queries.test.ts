import { describe, expect, it } from 'vitest'
import { DATA_COLUMNS } from '@/entities/phase/api/phase-repo'
import { assertPhaseField } from '@/entities/phase/api/queries'

/**
 * Регрессия: поля таблицы phases из блоков status/therapy не имели явного
 * `scope: 'phase'` в реестре, поэтому старый whitelist (фильтр по scope)
 * отбрасывал их, и отчёт падал с «Недопустимое поле фазы: main_component».
 * Whitelist должен базироваться на DATA_COLUMNS (колонки таблицы phases).
 */
describe('phase queries: assertPhaseField', () => {
  it('разрешает отчётные поля из блоков status/therapy без явного scope', () => {
    for (const col of ['main_component', 'ad_efficacy', 'switch_reason', 'prophylaxis_type']) {
      expect(assertPhaseField(col), col).toBe(col)
    }
  })

  it('разрешает любую колонку из DATA_COLUMNS', () => {
    for (const col of DATA_COLUMNS) {
      expect(assertPhaseField(col), col).toBe(col)
    }
  })

  it('отбрасывает системные, отсутствующие и враждебные имена колонок', () => {
    for (const bad of [
      'id',
      'patient_id',
      'phase_order_id',
      'updated_at',
      'nope',
      "x' OR 1=1 --",
      'DROP TABLE phases',
    ]) {
      expect(() => assertPhaseField(bad)).toThrow(/Недопустимое поле фазы/)
    }
  })
})
