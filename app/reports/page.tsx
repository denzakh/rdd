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
    phaseRatio,
    intermissionRatio,
    seasons,
    severity,
    component,
  ] = await Promise.all([
    genderDistribution(db, scope),
    averageAgeAtInclusion(db, scope),
    familyHistoryDistribution(db, scope),
    averageOnsetAge(db, scope),
    averageDiseaseDurationMonths(db, scope),
    averageDurations(db, scope),
    firstToPenultimatePhaseDuration(db, scope),
    firstToPenultimateIntermissionDuration(db, scope),
    seasonalDistribution(db, scope),
    depressionSeverityDistribution(db, scope),
    mainComponentDistribution(db, scope),
  ])

  const data: StatsReport = {
    generatedAt: new Date().toISOString(),
    patients: {
      total: gender.reduce((s, r) => s + r.count, 0),
      gender,
      averageAgeYears: ageAtInclusion.value,
      averageAgePatients: ageAtInclusion.patients,
      familyHistory,
    },
    phases: {
      onsetAge,
      diseaseDurationMonths: diseaseDur,
      avgPhaseMonths: avgDur.avgPhaseMonths,
      avgIntermissionMonths: avgDur.avgIntermissionMonths,
      phaseRows: avgDur.phaseRows,
      intermissionRows: avgDur.intermissionRows,
      phaseRatio,
      intermissionRatio,
      seasons,
      severity,
      component,
    },
  }

  const en = locale === 'en'

  return (
    <div>
      <Header displayName={user.displayName} role={user.role} />
      <main className="mx-auto max-w-[1000px] space-y-8 p-6">
        <h1 className="text-xl font-semibold">{en ? 'Reports' : 'Отчёты'}</h1>

        <StatisticsPanel data={data} locale={locale} />
        <ExportPanel locale={locale} />
      </main>
    </div>
  )
}
