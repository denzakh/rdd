/**
 * Демо-данные (docs/spec-stage-2.md §5).
 *
 * Запуск:
 *   npm run seed:demo          — локальная БД (getPlatformProxy, .wrangler/state)
 *   npm run seed:demo:remote   — прод-БД (wrangler d1 execute rdd --remote;
 *                                требует подтверждения «prod» или флага --yes)
 *
 * Локально данные пишутся через репозитории сущностей; в remote — SQL-файл
 * с INSERT'ами через wrangler d1 execute (паттерн scripts/create-user.ts).
 */
import { execSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { getPlatformProxy } from 'wrangler'
import { createPatientRepository, type PatientInput } from '../src/entities/patient'
import {
  createPhaseRepository,
  DATA_COLUMNS,
  PHASE_RELATIVE_ADMISSION,
  PHASE_RELATIVE_DISCHARGE,
  type PhaseInput,
} from '../src/entities/phase'

const PATIENTS: PatientInput[] = [
  {
    study_entry_date: '2023-04-10',
    birth_year: 1980,
    gender: 2,
    education_level: 3,
    career_level: 3,
    living_status: 2,
    disability_status: 0,
    family_history: 1,
    personality_type: 4,
  },
  {
    study_entry_date: '2024-01-15',
    birth_year: 1958,
    gender: 1,
    education_level: 2,
    career_level: 1,
    living_status: 1,
    disability_status: 2,
    family_history: 0,
    personality_type: 6,
  },
  {
    study_entry_date: '2024-09-01',
    birth_year: 1972,
    gender: 2,
    education_level: 3,
    career_level: 2,
    living_status: 3,
    disability_status: 0,
    family_history: 1,
    personality_type: 1,
  },
  {
    study_entry_date: '2025-02-20',
    birth_year: 1990,
    gender: 1,
    education_level: 2,
    career_level: 2,
    living_status: 4,
    disability_status: 0,
    family_history: 0,
    personality_type: 9,
  },
  {
    study_entry_date: '2025-06-30',
    birth_year: 1946,
    gender: 2,
    education_level: 1,
    career_level: 1,
    living_status: 1,
    disability_status: 3,
    family_history: 1,
    personality_type: 2,
  },
  {
    study_entry_date: '2023-11-05',
    birth_year: 1985,
    gender: 1,
    education_level: 3,
    career_level: 3,
    living_status: 3,
    disability_status: 0,
    family_history: 0,
    personality_type: 5,
  },
  {
    study_entry_date: '2024-04-18',
    birth_year: 1963,
    gender: 2,
    education_level: 2,
    career_level: 2,
    living_status: 2,
    disability_status: 1,
    family_history: 1,
    personality_type: 8,
  },
  {
    study_entry_date: '2024-10-22',
    birth_year: 1994,
    gender: 1,
    education_level: 2,
    career_level: 1,
    living_status: 4,
    disability_status: 0,
    family_history: 0,
    personality_type: 3,
  },
  {
    study_entry_date: '2025-03-08',
    birth_year: 1951,
    gender: 2,
    education_level: 1,
    career_level: 1,
    living_status: 1,
    disability_status: 2,
    family_history: 1,
    personality_type: 7,
  },
  {
    study_entry_date: '2025-07-12',
    birth_year: 1977,
    gender: 1,
    education_level: 3,
    career_level: 2,
    living_status: 2,
    disability_status: 0,
    family_history: 0,
    personality_type: 10,
  },
  {
    study_entry_date: '2025-09-28',
    birth_year: 2001,
    gender: 2,
    education_level: 2,
    career_level: 1,
    living_status: 3,
    disability_status: 0,
    family_history: 1,
    personality_type: 4,
  },
]

/**
 * Симптоматические профили пациентов (src/shared/config/registry/status.ts):
 * объективные признаки, внешний вид/моторика, специфика и психотика.
 * Бинарные поля — 0/1; orientation/insight: 1 — сохранены, 0 — снижены/нарушены.
 */
const SYMPTOM_PROFILES: Partial<PhaseInput>[] = [
  // 1. Тоскливая депрессия с утренним ритмом
  {
    main_component: 1,
    onset_trigger: 1,
    orientation: 1,
    insight: 1,
    melancholy_obj: 1,
    anxiety_obj: 0,
    apathy_obj: 0,
    sleep_worsening: 1,
    appetite_loss: 1,
    cognitive_impair: 1,
    physical_pain: 0,
    fatigue: 1,
    fixed_posture: 1,
    mimic_poverty: 1,
    monotonous_voice: 1,
    motor_retardation: 1,
    delayed_response: 1,
    restlessness: 0,
    affect_lability: 0,
    motor_agitation: 0,
    hygiene_decline: 0,
    diurnal_rhythm: 1,
    hypochondria: 0,
    hallucinations: 0,
    delusions: 0,
    obsessions: 0,
  },
  // 2. Тревожная с двигательным беспокойством, хуже вечером
  {
    main_component: 2,
    onset_trigger: 0,
    orientation: 1,
    insight: 1,
    melancholy_obj: 0,
    anxiety_obj: 1,
    apathy_obj: 0,
    sleep_worsening: 1,
    appetite_loss: 1,
    cognitive_impair: 0,
    physical_pain: 0,
    fatigue: 1,
    fixed_posture: 0,
    mimic_poverty: 0,
    monotonous_voice: 0,
    motor_retardation: 0,
    delayed_response: 0,
    restlessness: 1,
    affect_lability: 1,
    motor_agitation: 1,
    hygiene_decline: 0,
    diurnal_rhythm: 2,
    hypochondria: 0,
    hallucinations: 0,
    delusions: 0,
    obsessions: 0,
  },
  // 3. Апатическая на фоне обострения соматики
  {
    main_component: 3,
    onset_trigger: 7,
    orientation: 1,
    insight: 1,
    melancholy_obj: 0,
    anxiety_obj: 0,
    apathy_obj: 1,
    sleep_worsening: 0,
    appetite_loss: 0,
    cognitive_impair: 1,
    physical_pain: 0,
    fatigue: 1,
    fixed_posture: 0,
    mimic_poverty: 1,
    monotonous_voice: 1,
    motor_retardation: 0,
    delayed_response: 1,
    restlessness: 0,
    affect_lability: 0,
    motor_agitation: 0,
    hygiene_decline: 0,
    diurnal_rhythm: 0,
    hypochondria: 0,
    hallucinations: 0,
    delusions: 0,
    obsessions: 0,
  },
  // 4. Тревожно-тоскливая с ипохондрией и болевым синдромом (климакс)
  {
    main_component: 2,
    onset_trigger: 3,
    orientation: 1,
    insight: 1,
    melancholy_obj: 1,
    anxiety_obj: 1,
    apathy_obj: 0,
    sleep_worsening: 1,
    appetite_loss: 1,
    cognitive_impair: 0,
    physical_pain: 1,
    fatigue: 1,
    fixed_posture: 0,
    mimic_poverty: 0,
    monotonous_voice: 0,
    motor_retardation: 0,
    delayed_response: 0,
    restlessness: 1,
    affect_lability: 1,
    motor_agitation: 0,
    hygiene_decline: 0,
    diurnal_rhythm: 1,
    hypochondria: 1,
    hallucinations: 0,
    delusions: 3,
    obsessions: 0,
  },
  // 5. Астеническая / слабодушие после операции
  {
    main_component: 5,
    onset_trigger: 5,
    orientation: 1,
    insight: 1,
    melancholy_obj: 0,
    anxiety_obj: 0,
    apathy_obj: 1,
    sleep_worsening: 1,
    appetite_loss: 1,
    cognitive_impair: 1,
    physical_pain: 1,
    fatigue: 1,
    fixed_posture: 0,
    mimic_poverty: 0,
    monotonous_voice: 0,
    motor_retardation: 0,
    delayed_response: 1,
    restlessness: 0,
    affect_lability: 0,
    motor_agitation: 0,
    hygiene_decline: 0,
    diurnal_rhythm: 0,
    hypochondria: 0,
    hallucinations: 0,
    delusions: 0,
    obsessions: 0,
  },
  // 6. Психотическая: галлюцинации + бред ущерба/преследования, критика снижена
  {
    main_component: 1,
    onset_trigger: 0,
    orientation: 1,
    insight: 0,
    melancholy_obj: 1,
    anxiety_obj: 1,
    apathy_obj: 0,
    sleep_worsening: 1,
    appetite_loss: 1,
    cognitive_impair: 1,
    physical_pain: 0,
    fatigue: 0,
    fixed_posture: 1,
    mimic_poverty: 1,
    monotonous_voice: 1,
    motor_retardation: 1,
    delayed_response: 1,
    restlessness: 0,
    affect_lability: 0,
    motor_agitation: 0,
    hygiene_decline: 1,
    diurnal_rhythm: 0,
    hypochondria: 0,
    hallucinations: 1,
    delusions: 5,
    obsessions: 0,
  },
  // 7. С обсессивно-компульсивными симптомами
  {
    main_component: 2,
    onset_trigger: 1,
    orientation: 1,
    insight: 1,
    melancholy_obj: 0,
    anxiety_obj: 1,
    apathy_obj: 0,
    sleep_worsening: 1,
    appetite_loss: 0,
    cognitive_impair: 0,
    physical_pain: 0,
    fatigue: 1,
    fixed_posture: 0,
    mimic_poverty: 0,
    monotonous_voice: 0,
    motor_retardation: 0,
    delayed_response: 0,
    restlessness: 1,
    affect_lability: 1,
    motor_agitation: 1,
    hygiene_decline: 0,
    diurnal_rhythm: 1,
    hypochondria: 0,
    hallucinations: 0,
    delusions: 0,
    obsessions: 1,
  },
  // 8. Дереализация / деперсонализация, сверхценные идеи
  {
    main_component: 6,
    onset_trigger: 0,
    orientation: 1,
    insight: 0,
    melancholy_obj: 0,
    anxiety_obj: 1,
    apathy_obj: 1,
    sleep_worsening: 0,
    appetite_loss: 0,
    cognitive_impair: 1,
    physical_pain: 0,
    fatigue: 1,
    fixed_posture: 0,
    mimic_poverty: 1,
    monotonous_voice: 1,
    motor_retardation: 0,
    delayed_response: 1,
    restlessness: 0,
    affect_lability: 0,
    motor_agitation: 0,
    hygiene_decline: 0,
    diurnal_rhythm: 0,
    hypochondria: 0,
    hallucinations: 0,
    delusions: 1,
    obsessions: 0,
  },
  // 9. Апатическая с когнитивным снижением после ОНМК, ориентировка нарушена
  {
    main_component: 3,
    onset_trigger: 6,
    orientation: 0,
    insight: 0,
    melancholy_obj: 0,
    anxiety_obj: 0,
    apathy_obj: 1,
    sleep_worsening: 1,
    appetite_loss: 0,
    cognitive_impair: 1,
    physical_pain: 0,
    fatigue: 1,
    fixed_posture: 0,
    mimic_poverty: 1,
    monotonous_voice: 1,
    motor_retardation: 0,
    delayed_response: 1,
    restlessness: 0,
    affect_lability: 0,
    motor_agitation: 0,
    hygiene_decline: 1,
    diurnal_rhythm: 0,
    hypochondria: 0,
    hallucinations: 0,
    delusions: 0,
    obsessions: 0,
  },
  // 10. Меланхолический ступор на фоне ЧМТ, нигилистический бред
  {
    main_component: 1,
    onset_trigger: 4,
    orientation: 1,
    insight: 1,
    melancholy_obj: 1,
    anxiety_obj: 0,
    apathy_obj: 0,
    sleep_worsening: 1,
    appetite_loss: 1,
    cognitive_impair: 1,
    physical_pain: 0,
    fatigue: 0,
    fixed_posture: 1,
    mimic_poverty: 1,
    monotonous_voice: 1,
    motor_retardation: 1,
    delayed_response: 1,
    restlessness: 0,
    affect_lability: 0,
    motor_agitation: 0,
    hygiene_decline: 1,
    diurnal_rhythm: 1,
    hypochondria: 0,
    hallucinations: 0,
    delusions: 4,
    obsessions: 0,
  },
  // 11. Смешанная тревожно-тоскливая с бредом самообвинения и обсессиями
  {
    main_component: 2,
    onset_trigger: 1,
    orientation: 1,
    insight: 1,
    melancholy_obj: 1,
    anxiety_obj: 1,
    apathy_obj: 0,
    sleep_worsening: 1,
    appetite_loss: 1,
    cognitive_impair: 0,
    physical_pain: 0,
    fatigue: 1,
    fixed_posture: 0,
    mimic_poverty: 0,
    monotonous_voice: 0,
    motor_retardation: 0,
    delayed_response: 0,
    restlessness: 1,
    affect_lability: 1,
    motor_agitation: 1,
    hygiene_decline: 0,
    diurnal_rhythm: 2,
    hypochondria: 1,
    hallucinations: 0,
    delusions: 2,
    obsessions: 1,
  },
]

/**
 * Всего фаз на пациента — 4, 5 или 6: обычные с № (2–4) плюс служебные
 * 98 «Поступление» и 99 «Выписка». Количество разное у разных пациентов,
 * чтобы витрина и агрегаты не были однородными.
 */
const MIN_PHASES_TOTAL = 4

/** Всего фаз пациента: 4, 5 или 6 (детерминированно, без рандома). */
function phaseCountFor(patientIndex: number): number {
  return MIN_PHASES_TOTAL + (patientIndex % 3)
}

/** Прибавляет months к дате 'YYYY-MM-DD' (переход к следующей фазе). */
function addMonths(date: string, months: number): string {
  const [year, month] = date.split('-').map(Number)
  const total = year * 12 + (month - 1) + Math.round(months)
  const y = Math.floor(total / 12)
  const m = (total % 12) + 1
  return `${y}-${String(m).padStart(2, '0')}-15`
}

/**
 * Индексы пациентов, у которых выставляем тяжёлую депрессию:
 * depression_severity=3 — в фазе непосредственно ПЕРЕД 98 «Поступление»
 * (последняя обычная фаза), высокие шкалы HAM-D/Beck — в самой 98
 * (шкалы is_current_only заполняются только в 98/99).
 * Детерминированно (без рандома), чтобы сид был воспроизводим.
 */
const SEVERE_DEPRESSION_PATIENTS: ReadonlySet<number> = new Set([0, 4, 7])

/**
 * Фазы пациента отражают неблагоприятное течение (см. контекст статьи):
 * каждая следующая депрессивная фаза длиннее предыдущей (удлинение),
 * а интермиссии, наоборот, укорачиваются — в реальной выборке первая
 * ремиссия 101,1 ± 119,5 мес против 55,3 ± 87,7 в последней. Тяжесть
 * депрессии (depression_severity — клинический признак, не шкала)
 * нарастает от фазы к фазе; шкалы (hamd_total/beck_total/часы/MMSE,
 * is_current_only) — только в 98/99.
 * У пациентов из SEVERE_DEPRESSION_PATIENTS фаза непосредственно перед 98 —
 * тяжёлая (depression_severity=3), а шкалы в 98 остаются высокими.
 * Заблокированные/скрытые поля 98/99 (см. field-availability) в сид
 * не заполняются (NULL) — как и в UI, ввод туда закрыт.
 * На последней фазе (99 «Выписка») интермиссия ещё не наступила
 * (NULL — текущее состояние).
 */
function phasesFor(patientIndex: number): PhaseInput[] {
  const symptoms = SYMPTOM_PROFILES[patientIndex % SYMPTOM_PROFILES.length]
  if (!symptoms) throw new Error(`Нет симптом-профиля для индекса ${patientIndex}`)
  const total = phaseCountFor(patientIndex)
  // Всего фаз = обычные (1..N) + служебные 98 и 99.
  const ordinaryCount = Math.max(2, total - 2)
  const relativeIds = [
    ...Array.from({ length: ordinaryCount }, (_, k) => k + 1),
    PHASE_RELATIVE_ADMISSION,
    PHASE_RELATIVE_DISCHARGE,
  ]

  // Длительности: первая фаза 4–6 мес и +2–3 мес к каждой следующей;
  // первая ремиссия 84…40 мес, каждая следующая меньше на 14–20 мес
  // (минимум 12 мес). Так агрегаты по номеру фазы показывают удлинение
  // фаз и укорочение интермиссий.
  const durations: Array<{ phase: number; intermission: number | null }> = []
  let duration = 4 + (patientIndex % 3)
  let intermission = 84 - patientIndex * 4
  for (let i = 0; i < total; i++) {
    durations.push({
      phase: duration,
      intermission: i === total - 1 ? null : intermission,
    })
    duration += 2 + (patientIndex % 2)
    intermission = Math.max(12, intermission - (14 + (patientIndex % 3) * 3))
  }

  const phases: PhaseInput[] = []
  // Начальная дата — как раньше (по модулю 4), далее сдвиг на длительность
  // фазы + интермиссию, чтобы даты начал фаз были монотонными.
  let startDate = `202${2 + (patientIndex % 4)}-0${(patientIndex % 9) + 1}-15`
  for (const [i, d] of durations.entries()) {
    const relativeId = relativeIds[i]
    if (relativeId === undefined) throw new Error(`Нет relativeId для фазы ${i}`)
    const isOrdinary = relativeId < PHASE_RELATIVE_ADMISSION
    const isAdmission = relativeId === PHASE_RELATIVE_ADMISSION
    const isDischarge = relativeId === PHASE_RELATIVE_DISCHARGE
    // Доля неполных ремиссий растёт с течением заболевания (с 45% до 66%).
    const partialRemission = i >= 1 || patientIndex % 2 === 0
    // Тяжёлая депрессия у 3 пациентов: признак (depression_severity=3) —
    // в фазе непосредственно перед 98 (последняя обычная, i === total - 3),
    // высокие шкалы — в 98 (шкалы заполняются только в 98/99).
    const severeBeforeAdmission =
      isOrdinary && i === total - 3 && SEVERE_DEPRESSION_PATIENTS.has(patientIndex)
    const severeAdmission = isAdmission && SEVERE_DEPRESSION_PATIENTS.has(patientIndex)
    const hamd = severeAdmission ? 30 + (patientIndex % 3) : 16 + patientIndex * 3 + i * 2
    const beck = severeAdmission ? 42 + (patientIndex % 3) * 2 : 20 + patientIndex * 2 + i * 2
    const mmse =
      30 - (symptoms.cognitive_impair ? 3 : 0) - (symptoms.orientation === 0 ? 3 : 0) - i * 2

    // Заблокированные/скрытые поля 98/99 (field-availability) не заполняем:
    // UI их не показывает/блокирует, сервер savePhaseCells их отклоняет.
    // 98: скрыт ad_efficacy, заблокирована вся ремиссия.
    // 99: скрыты phase_start_date + ad_efficacy, заблокированы весь контроль
    // фазы, onset_trigger/main_component/depression_severity, вся терапия
    // и вся ремиссия.
    const blockedInPhase =
      isAdmission || isDischarge
        ? {
            ...(isDischarge
              ? {
                  phase_duration_months: null,
                  intermission_duration: null,
                  onset_trigger: null,
                  main_component: null,
                  depression_severity: null,
                }
              : {}),
            ad_efficacy: null,
            subdepression_const: null,
            affective_lability_rem: null,
            anxiety_lability_rem: null,
            unfavorable_env: null,
            pain_in_remission: null,
            treatment_in_remission: null,
            prophylaxis_type: null,
          }
        : {}

    phases.push({
      patient_id: 0,
      phase_relative_id: relativeId,
      phase_start_date: isDischarge ? null : startDate,
      ad_efficacy: isAdmission || isDischarge ? null : (patientIndex % 3) + 1,
      ...symptoms,
      // Картина ремиссии после текущей фазы (src/shared/config/registry/remission.ts).
      subdepression_const: partialRemission ? 1 : 0,
      affective_lability_rem: patientIndex % 3 === 0 ? 1 : 0,
      anxiety_lability_rem: patientIndex % 3 === 1 ? 1 : 0,
      unfavorable_env: patientIndex % 4 === 0 ? 1 : 0,
      pain_in_remission: symptoms.physical_pain ? 1 : 0,
      treatment_in_remission: patientIndex === 9 ? 0 : 1,
      prophylaxis_type: patientIndex === 9 ? 0 : (patientIndex % 3) + 1,
      // Удлинение фаз и укорочение интермиссий (durations выше).
      phase_duration_months: d.phase,
      intermission_duration: d.intermission,
      // Тяжесть депрессии: в 99 заблокирована (NULL); в фазе перед 98 у 3
      // пациентов тяжёлая (3), иначе нарастает от фазы к фазе.
      depression_severity: isDischarge
        ? null
        : severeBeforeAdmission
          ? 3
          : Math.min(3, 1 + Math.floor(i / Math.max(1, Math.ceil(total / 3)))),
      // Шкалы (is_current_only) — только в 98/99; в обычных фазах NULL.
      // hamd_severity — вычисляемое поле (calculate по hamd_total), в БД не хранится.
      hamd_total: isOrdinary ? null : hamd,
      beck_total: isOrdinary ? null : beck,
      mmse_total: isOrdinary ? null : mmse,
      clock_drawing_test: isOrdinary ? null : Math.max(0, 10 - i),
      // Поверх — NULL по заблокированным/скрытым полям 98/99 (после spread,
      // чтобы ...symptoms и значения выше их не затерли).
      ...blockedInPhase,
    })

    startDate = addMonths(startDate, d.phase + (d.intermission ?? 0))
  }
  return phases
}

// ---------- remote БД (wrangler d1 execute --remote) ----------

const D1_NAME = 'rdd'
const REGISTRY_VERSION = 1 // REGISTRY_CURRENT_VERSION (src/shared/lib/registry)

const sqlValue = (v: unknown): string => {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return `'${String(v).replace(/'/g, "''")}'`
}

/** Вывод `wrangler d1 execute --json`: массив результатов или одиночный объект. */
function parseWranglerJson(stdout: string): Record<string, unknown>[] {
  const arrStart = stdout.indexOf('[')
  const objStart = stdout.indexOf('{')
  const parsed =
    arrStart >= 0 && (objStart < 0 || arrStart < objStart)
      ? (JSON.parse(stdout.slice(arrStart)) as Array<{ results?: Record<string, unknown>[] }>)
      : (JSON.parse(stdout.slice(objStart)) as { results?: Record<string, unknown>[] })
  const first = Array.isArray(parsed) ? parsed[0] : parsed
  return first?.results ?? []
}

function maxPatientIdRemote(): number {
  const out = execSync(
    `npx wrangler d1 execute ${D1_NAME} --remote --json --command "SELECT COALESCE(MAX(id), 0) AS m FROM patients"`,
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }
  )
  const rows = parseWranglerJson(out)
  return Number(rows[0]?.m ?? 0)
}

function runSqlRemote(sql: string): void {
  const dir = mkdtempSync(join(tmpdir(), 'rdd-seed-'))
  const file = join(dir, 'seed.sql')
  try {
    writeFileSync(file, sql, 'utf8')
    console.log(`> wrangler d1 execute ${D1_NAME} --remote --file=${file}`)
    execSync(`npx wrangler d1 execute ${D1_NAME} --remote --yes --file=${file}`, {
      stdio: 'inherit',
    })
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/** Верификация: считаем пациентов всего и фазы, вставленные этим запуском. */
function verifyRemote(firstPatientId: number): void {
  const sql =
    `SELECT (SELECT COUNT(*) FROM patients) AS patients_total, ` +
    `(SELECT COUNT(*) FROM phases WHERE patient_id >= ${firstPatientId}) AS new_phases;`
  const out = execSync(`npx wrangler d1 execute ${D1_NAME} --remote --json --command "${sql}"`, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  })
  const row = parseWranglerJson(out)[0] ?? {}
  console.log(`   пациентов всего: ${row.patients_total}, фаз создано: ${row.new_phases}`)
}

/**
 * SQL для remote: пациенты с явными id (MAX(id)+1 и далее — детерминированно,
 * без last_insert_rowid), фазы ссылаются на эти id, phase_order_id — 1..n.
 */
function buildSeedSql(firstPatientId: number): string {
  const first = PATIENTS[0]
  if (!first) throw new Error('Нет демо-данных для вставки')
  const patientColumns = Object.keys(first)

  const stmts: string[] = []
  for (const [i, input] of PATIENTS.entries()) {
    const id = firstPatientId + i
    const record = input as Record<string, unknown>
    const patientValues = [REGISTRY_VERSION, ...patientColumns.map((c) => record[c] ?? null)]
    stmts.push(
      `INSERT INTO patients (registry_version, ${patientColumns.join(', ')}) ` +
        `VALUES (${patientValues.map(sqlValue).join(', ')});`
    )
    for (const [order, phase] of phasesFor(i).entries()) {
      const phaseRecord = phase as Record<string, unknown>
      const phaseValues = [
        id,
        order + 1, // phase_order_id — порядок вставки (1..n)
        // phase_relative_id — семантический номер: 1..N, затем 98 «Поступление» и 99 «Выписка».
        phaseRecord.phase_relative_id ?? order + 1,
        REGISTRY_VERSION,
        ...DATA_COLUMNS.map((c) => phaseRecord[c] ?? null),
      ]
      stmts.push(
        `INSERT INTO phases (patient_id, phase_order_id, phase_relative_id, registry_version, ${DATA_COLUMNS.join(', ')}) ` +
          `VALUES (${phaseValues.map(sqlValue).join(', ')});`
      )
    }
  }
  return stmts.join('\n')
}

async function seedRemote(): Promise<void> {
  const assumeYes = process.argv.includes('--yes')
  if (!assumeYes) {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    const answer = (
      await rl.question(
        `Записать демо-данные в ${D1_NAME} (remote)? Напечатайте "prod" для подтверждения: `
      )
    ).trim()
    rl.close()
    if (answer !== 'prod') {
      console.log('Отменено.')
      return
    }
  }

  const existing = maxPatientIdRemote()
  if (existing > 0) {
    console.log(`⚠ В базе уже ${existing} пациент(ов) — добавляю демо-данные поверх.`)
  }
  const firstPatientId = existing + 1

  runSqlRemote(buildSeedSql(firstPatientId))
  verifyRemote(firstPatientId)
  console.log('✅ Демо-данные созданы в remote D1')
}

async function main() {
  if (process.argv.includes('--remote')) {
    await seedRemote()
    return
  }

  console.log('Получаю env через getPlatformProxy (локальная БД)…')
  const { env, dispose } = await getPlatformProxy<CloudflareEnv>({ configPath: 'wrangler.jsonc' })
  try {
    const patients = createPatientRepository(env.DB)
    const phases = createPhaseRepository(env.DB)
    const existing = await patients.count()
    if (existing > 0) {
      console.log(`⚠ В базе уже ${existing} пациент(ов) — добавляю демо-данные поверх.`)
    }
    for (const [i, input] of PATIENTS.entries()) {
      const id = await patients.create(input)
      const patientPhases = phasesFor(i)
      for (const p of patientPhases) {
        await phases.create({ ...p, patient_id: id })
      }
      console.log(`  ✔ пациент #${id} + ${patientPhases.length} фаз`)
    }
    console.log('✅ Демо-данные созданы (npm run dev:cf → /patients)')
  } finally {
    await dispose()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
