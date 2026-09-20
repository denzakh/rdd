import type { Locale } from '@/shared/lib/intl'
import { optionLabel } from '@/shared/lib/intl'
import { FLAT_REGISTRY } from '@/shared/config'
import type { RegistryField } from '@/shared/config'
import { fmt1, type DistributionRow } from './distribution-table'
import { DistributionTableYes, yesFeatureRow } from './distribution-table-yes'
import { BinaryFeaturesSection } from './binary-features-section'
import { DistributionPie } from './distribution-pie'
import { GENDER_COLORS, SEASON_COLORS } from './colors'

// --- Контракт данных с app/reports/page.tsx (структурно совпадает
//     с результатами агрегатов entities) ---

export interface StatsValueCount {
  value: number
  count: number
}

export interface StatsAverage {
  value: number | null
  /** Выборочное среднее квадратичное отклонение (null, если строк < 2). */
  stddev: number | null
  patients: number
}

export interface StatsRatio {
  firstAvg: number | null
  penultimateAvg: number | null
  ratio: number | null
  patients: number
}

export interface StatsReport {
  generatedAt: string
  patients: {
    total: number
    gender: StatsValueCount[]
    averageAgeYears: number | null
    /** Выборочное СКО среднего возраста (null, если пациентов < 2). */
    averageAgeStddev: number | null
    averageAgePatients: number
    familyHistory: StatsValueCount[]
  }
  phases: {
    onsetAge: StatsAverage
    diseaseDurationMonths: StatsAverage
    /** Среднее количество фаз на пациента (± СКО) по пациентам с ≥ 1 фазой. */
    avgPhaseCount: StatsAverage
    avgPhaseMonths: number | null
    avgIntermissionMonths: number | null
    /** Выборочное СКО длительности фаз, мес (null, если фаз < 2). */
    stddevPhaseMonths: number | null
    /** Выборочное СКО длительности интермиссий, мес (null, если интермиссий < 2). */
    stddevIntermissionMonths: number | null
    phaseRows: number
    intermissionRows: number
    phaseRatio: StatsRatio
    intermissionRatio: StatsRatio
    seasons: Array<{ season: number; count: number }>
    severity: StatsValueCount[]
    component: StatsValueCount[]
    /** Бинарные признаки фаз (все 0/1-колонки реестра): «да»/знаменатель по фазам. */
    binaryFeatures: Array<{ fieldId: string; yes: number; total: number }>
  }
}

const FLAT = FLAT_REGISTRY as unknown as Record<string, RegistryField>

const SEASONS: Record<number, { ru: string; en: string }> = {
  1: { ru: 'Зима', en: 'Winter' },
  2: { ru: 'Весна', en: 'Spring' },
  3: { ru: 'Лето', en: 'Summer' },
  4: { ru: 'Осень', en: 'Autumn' },
}

const pick = (t: { ru: string; en: string }, locale: Locale): string =>
  locale === 'en' ? t.en : t.ru

/** Подписи опций реестра (gender, main_component, depression_severity). */
function optionRows(fieldId: string, values: StatsValueCount[], locale: Locale): DistributionRow[] {
  const field = FLAT[fieldId]
  return values.map((r) => {
    const opt = field?.options?.find((o) => Number(o.value) === r.value)
    return {
      value: r.value,
      label: opt !== undefined ? optionLabel(opt, locale) : String(r.value),
      count: r.count,
    }
  })
}

function seasonRows(
  values: Array<{ season: number; count: number }>,
  locale: Locale
): DistributionRow[] {
  return values.map((r) => ({
    value: r.season,
    label: SEASONS[r.season] ? pick(SEASONS[r.season], locale) : String(r.season),
    count: r.count,
  }))
}

/** Вид динамики: у фаз и интермиссий противоположный клинический смысл. */
type DynamicsKind = 'phase' | 'intermission'

/** Вывод о динамике по соотношению «первая / предпоследняя» (порог 5%). */
const dynamics = (ratio: number | null, en: boolean): string => {
  if (ratio === null) return '—'
  if (ratio > 1.05) return en ? 'Shortening' : 'Укорочение'
  if (ratio < 0.95) return en ? 'Lengthening' : 'Удлинение'
  return en ? 'No change' : 'Без изменений'
}

/**
 * Цвет вывода о динамике по клиническому смыслу:
 * фазы — укорочение хорошо (зелёный), удлинение плохо (красный);
 * интермиссии (ремиссии) — наоборот: укорочение плохо, удлинение хорошо.
 * «Без изменений» и «—» — нейтральный серый.
 */
const dynamicsClass = (ratio: number | null, kind: DynamicsKind): string => {
  if (ratio === null) return 'font-semibold text-neutral-400'
  if (ratio <= 1.05 && ratio >= 0.95) return 'font-semibold text-neutral-600'
  const shortening = ratio > 1.05
  const good = kind === 'phase' ? shortening : !shortening
  return good ? 'font-semibold text-green-700' : 'font-semibold text-red-700'
}

const monthsOrDash = (v: number | null, en: boolean): string =>
  v === null ? '—' : `${fmt1(v)} ${en ? 'mo' : 'мес'}`

const yearsOrDash = (v: number | null, en: boolean): string =>
  v === null ? '—' : `${fmt1(v)} ${en ? 'yrs' : 'лет'}`

/**
 * «Среднее ± СКО» (пример: «50 ± 2.2»); тире, если средняя или СКО недоступны
 * (нет данных или учтена одна строка). unit: 'yr' — годы, 'mo' — месяцы,
 * null — безразмерная величина (например, количество фаз).
 */
const meanPmSd = (
  mean: number | null,
  sd: number | null,
  unit: 'yr' | 'mo' | null,
  en: boolean
): React.ReactNode => {
  if (mean === null || sd === null) return '—'
  const u = unit === null ? null : unit === 'mo' ? (en ? 'mo' : 'мес') : en ? 'yrs' : 'лет'
  return (
    <>
      <b className="text-[1.3em]">{fmt1(mean)}</b>&nbsp;±&nbsp;{fmt1(sd)}
      {u !== null && <span>&nbsp;{u}</span>}
    </>
  )
}

/** Панель статистики страницы /reports (серверный компонент, без JS). */
export function StatisticsPanel({ data, locale }: { data: StatsReport; locale: Locale }) {
  const en = locale === 'en'
  const p = data.patients
  const f = data.phases

  const ratioCard = (title: string, r: StatsRatio, kind: DynamicsKind) => (
    <div className="space-y-2 rounded-md border border-neutral-200 p-3">
      <h4 className="text-xs font-semibold text-neutral-600">{title}</h4>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt className="text-neutral-500">{en ? 'First' : 'Первая'}</dt>
        <dd className="tabular-nums">{monthsOrDash(r.firstAvg, en)}</dd>
        <dt className="text-neutral-500">{en ? 'Penultimate' : 'Предпоследняя'}</dt>
        <dd className="tabular-nums">{monthsOrDash(r.penultimateAvg, en)}</dd>
        <dt className="text-neutral-500">
          {en ? 'Ratio (1st / penult.)' : 'Отношение (1-я / предпосл.)'}
        </dt>
        <dd className="tabular-nums">{r.ratio === null ? '—' : fmt1(r.ratio)}</dd>
        <dt className="text-neutral-500">{en ? 'Trend' : 'Вывод о динамике'}</dt>
        <dd className={dynamicsClass(r.ratio, kind)}>{dynamics(r.ratio, en)}</dd>
      </dl>
      <p className="text-xs text-neutral-500">
        {en
          ? `Based on ${r.patients} patients with ≥ 3 phases`
          : `По ${r.patients} пациентам с ≥ 3 фазами`}
      </p>
    </div>
  )

  return (
    <section className="space-y-6">
      {/* ----- По пациентам ----- */}
      <section className="space-y-4 rounded-md border border-neutral-300 p-4">
        <h2 className="text-sm font-semibold">{en ? 'By patient' : 'По пациентам'}</h2>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-neutral-600">
              {en ? 'Average age' : 'Средний возраст'}
            </h3>
            <p className="text-xl tabular-nums">
              {meanPmSd(p.averageAgeYears, p.averageAgeStddev, 'yr', en)}
            </p>
            <p className="text-xs text-neutral-500">
              {en
                ? `At study inclusion; based on ${p.averageAgePatients} patients`
                : `На момент включения; по ${p.averageAgePatients} пациентам`}
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-neutral-600">
              {en ? 'Average age at disease onset' : 'Средний возраст начала заболевания'}
            </h3>
            <p className="text-xl tabular-nums">
              {meanPmSd(f.onsetAge.value, f.onsetAge.stddev, 'yr', en)}
            </p>
            <p className="text-xs text-neutral-500">
              {en
                ? `Based on ${f.onsetAge.patients} patients (1st phase)`
                : `По ${f.onsetAge.patients} пациентам (1-я фаза)`}
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-neutral-600">
              {en ? 'Average disease duration' : 'Средняя длительность заболевания'}
            </h3>
            <p className="text-xl tabular-nums">
              {meanPmSd(f.diseaseDurationMonths.value, f.diseaseDurationMonths.stddev, 'mo', en)}
            </p>
            <p className="text-xs text-neutral-500">
              {f.diseaseDurationMonths.value === null
                ? en
                  ? 'Phases + intermissions'
                  : 'Фазы + интермиссии'
                : en
                  ? `Phases + intermissions, per ${f.diseaseDurationMonths.patients} patients (≈ ${yearsOrDash(f.diseaseDurationMonths.value / 12, en)})`
                  : `Фазы + интермиссии, по ${f.diseaseDurationMonths.patients} пациентам (≈ ${yearsOrDash(f.diseaseDurationMonths.value / 12, en)})`}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <DistributionTableYes
            rows={[
              yesFeatureRow(
                p.familyHistory,
                en
                  ? 'Hereditary mental burden'
                  : 'Наследственная отягощённость психическими заболеваниями'
              ),
            ]}
            locale={locale}
          />
        </div>
      </section>

      {/* ----- Круговые диаграммы с легендами в одном блоке (сетка 2 колонки) ----- */}
      <section className="space-y-4 rounded-md border border-neutral-300 p-4">
        <h2 className="text-sm font-semibold">{en ? 'Distributions' : 'Распределения'}</h2>

        <div className="grid gap-8 gap-x-12 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-neutral-600">
              {en ? 'Gender ratio' : 'Соотношение полов'}
            </h3>
            <DistributionPie
              rows={optionRows('gender', p.gender, locale)}
              locale={locale}
              unit="patients"
              title={en ? 'Gender ratio' : 'Соотношение полов'}
              colors={GENDER_COLORS}
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-neutral-600">
              {en ? 'Seasonality of exacerbations' : 'Сезонная зависимость обострений'}
            </h3>
            <DistributionPie
              rows={seasonRows(f.seasons, locale)}
              locale={locale}
              unit="phases"
              title={en ? 'Seasonality of exacerbations' : 'Сезонная зависимость обострений'}
              colors={SEASON_COLORS}
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-neutral-600">
              {en ? 'Depression severity' : 'Тяжесть депрессии'}
            </h3>
            <DistributionPie
              rows={optionRows('depression_severity', f.severity, locale)}
              locale={locale}
              unit="phases"
              title={en ? 'Depression severity' : 'Тяжесть депрессии'}
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-neutral-600">
              {en ? 'Predominant depression component' : 'Преобладающий компонент депрессии'}
            </h3>
            <DistributionPie
              rows={optionRows('main_component', f.component, locale)}
              locale={locale}
              unit="phases"
              title={en ? 'Predominant depression component' : 'Преобладающий компонент депрессии'}
            />
          </div>
        </div>
      </section>

      {/* ----- По фазам ----- */}
      <section className="space-y-4 rounded-md border border-neutral-300 p-4">
        <h2 className="text-sm font-semibold">
          {en ? 'Phases and intermissions' : 'Фазы и интермиссии'}
        </h2>

        <div className="space-y-2">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <dl className="flex flex-col gap-x-4 gap-y-1 text-sm">
              <dt className="text-xs font-semibold text-neutral-600">
                {en ? 'Average number of phases' : 'Среднee количество фаз'}
              </dt>
              <dd className="text-xl tabular-nums">
                {meanPmSd(f.avgPhaseCount.value, f.avgPhaseCount.stddev, null, en)}
              </dd>
            </dl>
            <dl className="flex flex-col gap-x-4 gap-y-1 text-sm">
              <dt className="text-xs font-semibold text-neutral-600">
                {en ? 'Average durations phase' : 'Средняя длительность фаз'}
              </dt>
              <dd className="text-xl tabular-nums">
                {meanPmSd(f.avgPhaseMonths, f.stddevPhaseMonths, 'mo', en)}
              </dd>
            </dl>
            <dl className="flex flex-col gap-x-4 gap-y-1 text-sm">
              <dt className="text-xs font-semibold text-neutral-600">
                {en ? 'Average durations intermission' : 'Средняя длительность интермиссий'}
              </dt>
              <dd className="text-xl tabular-nums">
                {meanPmSd(f.avgIntermissionMonths, f.stddevIntermissionMonths, 'mo', en)}
              </dd>
            </dl>
          </div>
          <p className="text-xs text-neutral-500">
            {f.avgPhaseCount.value === null
              ? en
                ? 'No phases recorded'
                : 'Нет зарегистрированных фаз'
              : en
                ? `Phases per patient; based on ${f.avgPhaseCount.patients} patients`
                : `Количество фаз на пациента; по ${f.avgPhaseCount.patients} пациентам`}
            .&nbsp;
            {en
              ? `${f.phaseRows} phases / ${f.intermissionRows} intermissions with recorded duration`
              : `Фаз с заполненной длительностью: ${f.phaseRows}; интермиссий: ${f.intermissionRows}`}
            .
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {ratioCard(
            en
              ? 'Dynamics of phases: first vs penultimate'
              : 'Динамика фаз: первая против предпоследней',
            f.phaseRatio,
            'phase'
          )}
          {ratioCard(
            en
              ? 'Dynamics of intermissions: first vs penultimate'
              : 'Динамика интермиссий: первая против предпоследней',
            f.intermissionRatio,
            'intermission'
          )}
        </div>
      </section>
      <section className="space-y-4 rounded-md border border-neutral-300 p-4">
        <h2 className="text-sm font-semibold">
          {en ? 'Binary phase features' : 'Бинарные признаки фаз'}
        </h2>
        <BinaryFeaturesSection counts={f.binaryFeatures} locale={locale} />
      </section>
    </section>
  )
}
