import { Header, requireUser } from '@/features/auth'
import { ExportPanel, StatisticsPanel, type StatsReport } from '@/features/reports'
import {
  averageAgeAtInclusion,
  familyHistoryDistribution,
  genderDistribution,
  patientScopeFor,
} from '@/entities/patient'
import {
  averageDiseaseDurationMonths,
  averageDurations,
  averageOnsetAge,
  averagePhasesPerPatient,
  binaryFeatureDistributions,
  depressionSeverityDistribution,
  firstToPenultimateIntermissionDuration,
  firstToPenultimatePhaseDuration,
  mainComponentDistribution,
  seasonalDistribution,
} from '@/entities/phase'
import { getDb } from '@/shared/api/db'
import { getLocale } from '@/shared/lib/intl'

export default async function ReportsPage() {
  const user = await requireUser()
  const locale = await getLocale()
  const db = await getDb()
  const scope = patientScopeFor(user)

  const [
    gender,
    ageAtInclusion,
    familyHistory,
    onsetAge,
    diseaseDur,
    avgDur,
    phaseCount,
    phaseRatio,
    intermissionRatio,
    seasons,
    severity,
    component,
    binaryFeatures,
  ] = await Promise.all([
    genderDistribution(db, scope),
    averageAgeAtInclusion(db, scope),
    familyHistoryDistribution(db, scope),
    averageOnsetAge(db, scope),
    averageDiseaseDurationMonths(db, scope),
    averageDurations(db, scope),
    averagePhasesPerPatient(db, scope),
    firstToPenultimatePhaseDuration(db, scope),
    firstToPenultimateIntermissionDuration(db, scope),
    seasonalDistribution(db, scope),
    depressionSeverityDistribution(db, scope),
    mainComponentDistribution(db, scope),
    binaryFeatureDistributions(db, scope),
  ])

  const data: StatsReport = {
    generatedAt: new Date().toISOString(),
    patients: {
      total: gender.reduce((s, r) => s + r.count, 0),
      gender,
      averageAgeYears: ageAtInclusion.value,
      averageAgeStddev: ageAtInclusion.stddev,
      averageAgePatients: ageAtInclusion.patients,
      familyHistory,
    },
    phases: {
      onsetAge,
      diseaseDurationMonths: diseaseDur,
      avgPhaseCount: phaseCount,
      avgPhaseMonths: avgDur.avgPhaseMonths,
      avgIntermissionMonths: avgDur.avgIntermissionMonths,
      stddevPhaseMonths: avgDur.stddevPhaseMonths,
      stddevIntermissionMonths: avgDur.stddevIntermissionMonths,
      phaseRows: avgDur.phaseRows,
      intermissionRows: avgDur.intermissionRows,
      phaseRatio,
      intermissionRatio,
      seasons,
      severity,
      component,
      binaryFeatures,
    },
  }

  const en = locale === 'en'

  return (
    <div>
      <Header displayName={user.displayName} role={user.role} />
      <main className="mx-auto max-w-[1000px] space-y-6 p-6">
        <h1 className="text-xl font-semibold">{en ? 'Reports' : 'Отчёты'}</h1>
        <ExportPanel locale={locale} />

        <h2 className="text-xl font-semibold">{en ? 'Statistics' : 'Статистика'}</h2>
        <StatisticsPanel data={data} locale={locale} />
      </main>
    </div>
  )
}
