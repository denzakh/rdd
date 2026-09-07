/**
 * Демо-данные для локальной разработки (docs/spec-stage-2.md §5).
 * Запуск: npm run seed:demo — ТОЛЬКО локальная БД (getPlatformProxy).
 * На прод запрещён: скрипт не принимает --remote и работает через
 * локальный wrangler-прокси.
 */
import { getPlatformProxy } from 'wrangler'
import { createPatientRepository, type PatientInput } from '../src/entities/patient'
import { createPhaseRepository, type PhaseInput } from '../src/entities/phase'

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
]

function phasesFor(patientIndex: number): PhaseInput[] {
  const base: Partial<PhaseInput> = {
    phase_start_date: `202${2 + patientIndex}-0${(patientIndex % 9) + 1}-15`,
    main_component: (patientIndex % 3) + 1,
    ad_efficacy: (patientIndex % 3) + 1,
    hamd_total: 16 + patientIndex * 3,
    beck_total: 20 + patientIndex * 2,
    mmse_total: 28,
  }
  return [
    { patient_id: 0, ...base, phase_duration_months: 4 + patientIndex },
    { patient_id: 0, ...base, phase_duration_months: 2 + patientIndex, intermission_duration: 5 },
  ]
}

async function main() {
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
