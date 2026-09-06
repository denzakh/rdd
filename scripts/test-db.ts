/**
 * Интеграционная проверка слоя доступа к D1 (локальная БД).
 * Запуск: npm run test:db
 *
 * Использует тот же `getPlatformProxy`, что opennext — читает wrangler.jsonc
 * и даёт типизированный env (в т.ч. env.DB) для локального состояния.
 *
 * База должна быть создана: npm run db:restart
 */
import { getPlatformProxy } from 'wrangler'
import {
  createPatientRepository,
  createPhaseRepository,
  type PatientInput,
  type PhaseInput,
} from '../src/shared/api'
import { applyComputed } from '../src/shared/api/with-computed'

const assert = (cond: unknown, msg: string) => {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`)
  console.log(`  ✔ ${msg}`)
}

async function main() {
  console.log('Получаю env через getPlatformProxy…')
  const { env, dispose } = await getPlatformProxy<CloudflareEnv>({ configPath: 'wrangler.jsonc' })

  const patients = createPatientRepository(env.DB)
  const phases = createPhaseRepository(env.DB)

  console.log('— CRUD пациента —')
  const patientInput: PatientInput = {
    study_entry_date: '2024-03-01',
    birth_year: 1975,
    gender: 1,
    education_level: 3,
    career_level: 2,
    living_status: 2,
    disability_status: 0,
    family_history: 0,
    personality_type: 5,
  }
  const patientId = await patients.create(patientInput)
  assert(Number.isInteger(patientId) && patientId > 0, `created patient id=${patientId}`)

  const found = await patients.findById(patientId)
  assert(found?.birth_year === 1975, 'findById returns row')
  assert(found?.personality_type === 5, 'stored values intact')

  // Вычисляемые поля из реестра: 1975 г.р., включение 2024-03-01 -> возраст ~49 -> группа 1
  const withComputed = applyComputed(found!, 'patient')
  assert(typeof withComputed.current_age === 'number', 'current_age computed')
  assert(withComputed.age_group === 1, 'age_group computed from current_age')

  await patients.update(patientId, { education_level: 2 })
  const updated = await patients.findById(patientId)
  assert(updated?.education_level === 2, 'update works')

  const list = await patients.list()
  assert(
    list.some((p) => p.id === patientId),
    'list contains patient'
  )

  console.log('— CRUD фаз —')
  const phaseInput: PhaseInput = {
    patient_id: patientId,
    phase_start_date: '2024-03-01',
    phase_duration_months: 6.0,
    intermission_duration: null,
    hamd_total: 18,
    beck_total: 22,
    mmse_total: 29,
    clock_drawing_test: 3,
  }
  const phase1 = await phases.create(phaseInput)
  assert(Number.isInteger(phase1) && phase1 > 0, `created phase id=${phase1}`)

  const p1 = await phases.findById(phase1)
  assert(p1?.phase_order_id === 1, 'first phase order_id=1')
  assert(p1?.hamd_total === 18, 'phase stored values intact')

  const phase2 = await phases.create({ ...phaseInput, hamd_total: 25 })
  const p2 = await phases.findById(phase2)
  assert(p2?.phase_order_id === 2, 'second phase order_id auto-incremented=2')

  const byPatient = await phases.listByPatient(patientId)
  assert(byPatient.length === 2, 'listByPatient returns 2 phases')

  await phases.update(phase1, { hamd_total: 20 })
  const p1u = await phases.findById(phase1)
  assert(p1u?.hamd_total === 20, 'phase update works')

  console.log('— cleanup —')
  await phases.remove(phase1)
  await phases.remove(phase2)
  await patients.remove(patientId)
  const afterCleanup = await phases.listByPatient(patientId)
  assert(afterCleanup.length === 0, 'phases removed (cascade not needed, manual)')
  const gone = await patients.findById(patientId)
  assert(gone === null, 'patient removed')

  await dispose()
  console.log('\n✅ Все проверки слоя доступа к D1 прошли')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
