import { afterAll, describe, expect, it } from 'vitest'
import { createPatientRepository } from '@/entities/patient'
import {
  averageDiseaseDurationMonths,
  averageDurations,
  averageOnsetAge,
  countByField,
  depressionSeverityDistribution,
  firstToPenultimateIntermissionDuration,
  firstToPenultimatePhaseDuration,
  mainComponentDistribution,
  phaseDurationsByOrder,
  seasonalDistribution,
  PHASE_RELATIVE_ADMISSION,
  PHASE_RELATIVE_DISCHARGE,
} from '@/entities/phase'
import { cleanupPatient, disposeTestDb, getTestDb } from '../helpers/db'

/**
 * Новые агрегаты /reports по фазам: возраст начала заболевания, длительность
 * заболевания, средние длительности, динамика «первая → предпоследняя»
 * (фазы/интермиссии), сезонная зависимость, тяжесть депрессии
 * (клинический признак depression_severity), компонент.
 * Все учитывают согласие пациента и data_scope (базово — { mode: 'all' }).
 */
afterAll(disposeTestDb)

/** Паспортные поля, обязательные для create() (PatientRow без id/version). */
const basePatient = {
  study_entry_date: '2025-01-10',
  birth_year: 1980,
  gender: 1,
  education_level: 2,
  career_level: 2,
  living_status: 1,
  disability_status: 0,
  family_history: 0,
  personality_type: 3,
}

interface PhaseSeed {
  phase_start_date?: string | null
  phase_duration_months?: number | null
  intermission_duration?: number | null
  hamd_total?: number | null
  main_component?: number | null
  depression_severity?: number | null
}

async function insertPhase(
  db: D1Database,
  patientId: number,
  orderId: number,
  p: PhaseSeed,
  relativeId: number = orderId
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO phases (patient_id, phase_order_id, phase_relative_id, phase_start_date, phase_duration_months,
         intermission_duration, hamd_total, main_component, depression_severity)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      patientId,
      orderId,
      relativeId,
      p.phase_start_date ?? null,
      p.phase_duration_months ?? null,
      p.intermission_duration ?? null,
      p.hamd_total ?? null,
      p.main_component ?? null,
      p.depression_severity ?? null
    )
    .run()
}

describe('агрегаты /reports по фазам', () => {
  it('возраст начала / длительности / динамика / сезоны / тяжесть / компонент', async () => {
    const db = await getTestDb()
    const repo = createPatientRepository(db)

    // Пациент A: 3 фазы — фазы удлиняются (6→8→10), интермиссии укорачиваются (12→10).
    const idA = await repo.create({ ...basePatient, birth_year: 1980 })
    await insertPhase(db, idA, 1, {
      phase_start_date: '2020-03-10',
      phase_duration_months: 6,
      intermission_duration: 12,
      hamd_total: 10,
      main_component: 1,
      depression_severity: 1,
    })
    await insertPhase(db, idA, 2, {
      phase_start_date: '2021-09-15',
      phase_duration_months: 8,
      intermission_duration: 10,
      hamd_total: 20,
      main_component: 2,
      depression_severity: 2,
    })
    await insertPhase(db, idA, 3, {
      phase_start_date: '2023-01-20',
      phase_duration_months: 10,
      intermission_duration: null,
      hamd_total: 30,
      main_component: 1,
      depression_severity: 3,
    })

    // Пациент B: 2 фазы — для «предпоследней» (минимум 3 фазы) не подходит.
    const idB = await repo.create({ ...basePatient, birth_year: 1990 })
    await insertPhase(db, idB, 1, {
      phase_start_date: '2015-06-05',
      phase_duration_months: 4,
      intermission_duration: 2,
      hamd_total: 6,
      main_component: 3,
      depression_severity: 2,
    })
    await insertPhase(db, idB, 2, {
      phase_start_date: '2016-01-01',
      phase_duration_months: 6,
      intermission_duration: null,
      hamd_total: 15,
      main_component: 3,
      depression_severity: null, // не заполнено — в распределение не попадает
    })

    try {
      // --- средний возраст начала заболевания (1-я фаза): (2020-1980)+(2015-1990)=65 → 32.5
      const onset = await averageOnsetAge(db, { mode: 'all' })
      expect(onset.patients).toBe(2)
      expect(onset.value).toBeCloseTo(32.5, 6)
      // выборочное СКО: значения [40, 25] → s = √112.5 ≈ 10.6066
      expect(onset.stddev).toBeCloseTo(Math.sqrt(112.5), 6)

      // --- длительность заболевания, мес: A=(6+8+10)+(12+10)=46, B=(4+6)+2=12 → 29
      const dur = await averageDiseaseDurationMonths(db, { mode: 'all' })
      expect(dur.patients).toBe(2)
      expect(dur.value).toBeCloseTo(29, 6)
      // выборочное СКО: значения [46, 12] → s = √578 ≈ 24.0416
      expect(dur.stddev).toBeCloseTo(Math.sqrt(578), 6)

      // --- средние по строкам: фазы (6+8+10+4+6)/5=6.8, интермиссии (12+10+2)/3=8
      const avg = await averageDurations(db, { mode: 'all' })
      expect(avg.avgPhaseMonths).toBeCloseTo(6.8, 6)
      expect(avg.avgIntermissionMonths).toBeCloseTo(8, 6)
      expect(avg.phaseRows).toBe(5)
      expect(avg.intermissionRows).toBe(3)
      // выборочное СКО: фазы [6,8,10,4,6] → s = √5.2 ≈ 2.2804; интермиссии [12,10,2] → s = √28 ≈ 5.2915
      expect(avg.stddevPhaseMonths).toBeCloseTo(Math.sqrt(5.2), 6)
      expect(avg.stddevIntermissionMonths).toBeCloseTo(Math.sqrt(28), 6)

      // --- динамика фаз: первая 6 / предпоследняя 8 → 0.75 (удлинение)
      const ph = await firstToPenultimatePhaseDuration(db, { mode: 'all' })
      expect(ph.patients).toBe(1) // только A (у B < 3 фаз)
      expect(ph.firstAvg).toBeCloseTo(6, 6)
      expect(ph.penultimateAvg).toBeCloseTo(8, 6)
      expect(ph.ratio).toBeCloseTo(0.75, 6)

      // --- динамика интермиссий: первая 12 / предпоследняя 10 → 1.2 (укорочение)
      const itr = await firstToPenultimateIntermissionDuration(db, { mode: 'all' })
      expect(itr.firstAvg).toBeCloseTo(12, 6)
      expect(itr.penultimateAvg).toBeCloseTo(10, 6)
      expect(itr.ratio).toBeCloseTo(1.2, 6)

      // --- сезоны: март=2(весна), сентябрь=4(осень), январь=1(зима) ×2, июнь=3(лето)
      const seasons = await seasonalDistribution(db, { mode: 'all' })
      const s = (season: number) => seasons.find((x) => x.season === season)?.count ?? 0
      expect(s(1)).toBe(2)
      expect(s(2)).toBe(1)
      expect(s(3)).toBe(1)
      expect(s(4)).toBe(1)

      // --- тяжесть депрессии (фазы) — клинический признак depression_severity,
      // НЕ шкала: 1→A1, 2→A2+B1, 3→A3; B2 (NULL) исключён. HAM-D не влияет.
      const sev = await depressionSeverityDistribution(db, { mode: 'all' })
      const sv = (v: number) => sev.find((x) => x.value === v)?.count ?? 0
      expect(sv(1)).toBe(1)
      expect(sv(2)).toBe(2)
      expect(sv(3)).toBe(1)
      expect(sev.reduce((s, x) => s + x.count, 0)).toBe(4)

      // --- компонент (фаз): 1→A(1,3), 2→A(2), 3→B(1,2)
      const comp = await mainComponentDistribution(db, { mode: 'all' })
      const cv = (v: number) => comp.find((x) => x.value === v)?.count ?? 0
      expect(cv(1)).toBe(2)
      expect(cv(2)).toBe(1)
      expect(cv(3)).toBe(2)
    } finally {
      for (const id of [idA, idB]) await cleanupPatient(db, id)
    }
  })

  it('служебные фазы 98/99 исключены из статистики', async () => {
    const db = await getTestDb()
    const repo = createPatientRepository(db)
    const id = await repo.create({ ...basePatient, birth_year: 1990 })

    // Два обычных эпизода (relative_id 1, 2) + служебные «Поступление» (98) и
    // «Выписка» (99) с намеренно большими длительностями и признаками.
    await insertPhase(db, id, 1, {
      phase_start_date: '2020-01-15',
      phase_duration_months: 6,
      intermission_duration: 3,
      hamd_total: 10,
      main_component: 1,
      depression_severity: 1,
    })
    await insertPhase(db, id, 2, {
      phase_start_date: '2020-07-15',
      phase_duration_months: 8,
      intermission_duration: null,
      hamd_total: 20,
      main_component: 2,
      depression_severity: 2,
    })
    await insertPhase(
      db,
      id,
      3,
      {
        phase_start_date: '2021-03-15',
        phase_duration_months: 100,
        intermission_duration: 50,
        hamd_total: 30,
        main_component: 3,
        depression_severity: 3,
      },
      PHASE_RELATIVE_ADMISSION
    )
    await insertPhase(
      db,
      id,
      4,
      {
        phase_start_date: '2021-09-15',
        phase_duration_months: 100,
        intermission_duration: 50,
        hamd_total: 30,
        main_component: 3,
        depression_severity: 1,
      },
      PHASE_RELATIVE_DISCHARGE
    )

    try {
      // Средние считаются только по двум обычным фазам (6 и 8 мес).
      const avg = await averageDurations(db, { mode: 'all' })
      expect(avg.phaseRows).toBe(2)
      expect(avg.intermissionRows).toBe(1)
      expect(avg.avgPhaseMonths).toBeCloseTo(7, 6)
      expect(avg.avgIntermissionMonths).toBeCloseTo(3, 6)
      expect(avg.stddevPhaseMonths).toBeCloseTo(Math.sqrt(2), 6)
      expect(avg.stddevIntermissionMonths).toBeNull()

      // Длительность заболевания: (6 + 3) + 8 = 17 мес (без 98/99).
      const dur = await averageDiseaseDurationMonths(db, { mode: 'all' })
      expect(dur.patients).toBe(1)
      expect(dur.value).toBeCloseTo(17, 6)

      // Возраст начала: 2020 − 1990 = 30 лет.
      const onset = await averageOnsetAge(db, { mode: 'all' })
      expect(onset.patients).toBe(1)
      expect(onset.value).toBeCloseTo(30, 6)

      // Сезонность: только зима (янв) и лето (июл) обычных фаз.
      const seasons = await seasonalDistribution(db, { mode: 'all' })
      expect(seasons.reduce((s, x) => s + x.count, 0)).toBe(2)
      expect(seasons.find((x) => x.season === 1)?.count).toBe(1)
      expect(seasons.find((x) => x.season === 3)?.count).toBe(1)
      expect(seasons.find((x) => x.season === 2)).toBeUndefined()
      expect(seasons.find((x) => x.season === 4)).toBeUndefined()

      // Тяжесть/компонент: 98/99 не попали (значения 3 отсутствуют).
      const sev = await depressionSeverityDistribution(db, { mode: 'all' })
      expect(sev.reduce((s, x) => s + x.count, 0)).toBe(2)
      expect(sev.find((x) => x.value === 3)).toBeUndefined()

      const comp = await mainComponentDistribution(db, { mode: 'all' })
      expect(comp.reduce((s, x) => s + x.count, 0)).toBe(2)
      expect(comp.find((x) => x.value === 3)).toBeUndefined()

      // «Предпоследняя» требует ≥ 3 обычных эпизодов: служебные не считаются.
      const ph = await firstToPenultimatePhaseDuration(db, { mode: 'all' })
      expect(ph.patients).toBe(0)
      expect(ph.firstAvg).toBeNull()

      // Группировка по порядку вставки тоже отсекает служебные строки.
      const byOrder = await phaseDurationsByOrder(db, { mode: 'all' })
      expect(byOrder.map((r) => r.phase_order_id)).toEqual([1, 2])

      // countByField — число РАЗНЫХ пациентов с признаком, без 98/99.
      const byComponent = await countByField(db, 'main_component', { mode: 'all' })
      expect(byComponent.find((r) => r.value === 3)).toBeUndefined()
    } finally {
      await cleanupPatient(db, id)
    }
  })
})
