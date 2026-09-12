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
import { createPhaseRepository, DATA_COLUMNS, type PhaseInput } from '../src/entities/phase'

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

function phasesFor(patientIndex: number): PhaseInput[] {
  // Год фазы — по модулю 4, чтобы не уезжать в будущее при росте числа пациентов.
  const base: Partial<PhaseInput> = {
    phase_start_date: `202${2 + (patientIndex % 4)}-0${(patientIndex % 9) + 1}-15`,
    ad_efficacy: (patientIndex % 3) + 1,
  }
  const symptoms = SYMPTOM_PROFILES[patientIndex % SYMPTOM_PROFILES.length]

  // Фаза обострения: полный симптоматический профиль, высокие баллы шкал.
  const acute: Partial<PhaseInput> = {
    ...base,
    ...symptoms,
    hamd_total: 16 + patientIndex * 3,
    beck_total: 20 + patientIndex * 2,
    mmse_total: 30 - (symptoms.cognitive_impair ? 3 : 0) - (symptoms.orientation === 0 ? 3 : 0),
  }

  // Вторая фаза — ремиссия: острая симптоматика угасает, остаются
  // резидуальные признаки и факты о лечении в интермиссии.
  const remission: Partial<PhaseInput> = {
    ...base,
    ...symptoms,
    // острая симптоматика и психотика уходят
    melancholy_obj: 0,
    anxiety_obj: 0,
    apathy_obj: 0,
    hallucinations: 0,
    delusions: 0,
    obsessions: 0,
    motor_agitation: 0,
    motor_retardation: 0,
    fixed_posture: 0,
    hygiene_decline: 0,
    diurnal_rhythm: 0,
    orientation: 1,
    insight: 1,
    sleep_worsening: 0,
    appetite_loss: 0,
    // резидуальная симптоматика
    fatigue: 1,
    affect_lability: 1,
    cognitive_impair: symptoms.cognitive_impair ? 1 : 0,
    physical_pain: symptoms.physical_pain ? 1 : 0,
    hypochondria: symptoms.hypochondria ? 1 : 0,
    // картина ремиссии (src/shared/config/registry/remission.ts)
    subdepression_const: patientIndex % 2,
    affective_lability_rem: patientIndex % 3 === 0 ? 1 : 0,
    anxiety_lability_rem: patientIndex % 3 === 1 ? 1 : 0,
    unfavorable_env: patientIndex % 4 === 0 ? 1 : 0,
    pain_in_remission: symptoms.physical_pain ? 1 : 0,
    treatment_in_remission: patientIndex === 9 ? 0 : 1,
    prophylaxis_type: patientIndex === 9 ? 0 : (patientIndex % 3) + 1,
    // шкалы в ремиссии заметно ниже
    hamd_total: 6 + (patientIndex % 4),
    beck_total: 8 + (patientIndex % 5),
    mmse_total: 30 - (symptoms.cognitive_impair ? 2 : 0),
  }

  return [
    { patient_id: 0, ...acute, phase_duration_months: 4 + patientIndex },
    {
      patient_id: 0,
      ...remission,
      phase_duration_months: 2 + patientIndex,
      intermission_duration: 5,
    },
  ]
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
        order + 1,
        REGISTRY_VERSION,
        ...DATA_COLUMNS.map((c) => phaseRecord[c] ?? null),
      ]
      stmts.push(
        `INSERT INTO phases (patient_id, phase_order_id, registry_version, ${DATA_COLUMNS.join(', ')}) ` +
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
      for (const p of phasesFor(i)) {
        await phases.create({ ...p, patient_id: id })
      }
      console.log(`  ✔ пациент #${id} + 2 фазы`)
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
