import type { Locale } from '@/shared/lib/intl'
import { fmt1, type DistributionRow } from './distribution-table'
import { DEFAULT_COLORS, FALLBACK_COLOR, type SliceColors } from './colors'

interface Slice extends DistributionRow {
  pct: number
  color: string
  path: string
}

/**
 * Чистое разбиение строк на сектора: угол накопления живёт внутри функции.
 * Сектора начинаются сверху (12 часов) и идут по часовой стрелке.
 * Экспортируется для unit-тестов геометрии.
 */
export function buildSlices(
  rows: DistributionRow[],
  total: number,
  colors: SliceColors = DEFAULT_COLORS
): Slice[] {
  const slices: Slice[] = []
  let offset = 0
  for (const row of rows) {
    const start = (offset / total) * Math.PI * 2 - Math.PI / 2
    offset += row.count
    const end = (offset / total) * Math.PI * 2 - Math.PI / 2
    const pct = (row.count / total) * 100
    const arc = (angle: number) => `${100 + 96 * Math.cos(angle)} ${100 + 96 * Math.sin(angle)}`
    slices.push({
      ...row,
      pct,
      color: colors[row.value] ?? FALLBACK_COLOR,
      path: `M 100 100 L ${arc(start)} A 96 96 0 ${pct > 50 ? 1 : 0} 1 ${arc(end)} Z`,
    })
  }
  return slices
}

interface DistributionPieProps {
  rows: DistributionRow[]
  locale: Locale
  title: string
  unit: 'patients' | 'phases'
  /** Переопределение палитры (например, для пола); по умолчанию — по значению. */
  colors?: SliceColors
}

/** Серверная секторная диаграмма; доли считаются только по заполненным значениям. */
export function DistributionPie({ rows, locale, title, unit, colors }: DistributionPieProps) {
  const en = locale === 'en'
  const total = rows.reduce((sum, row) => sum + row.count, 0)
  if (total === 0) {
    return <p className="text-xs text-neutral-500">{en ? 'No data' : 'Нет данных'}</p>
  }

  const slices = buildSlices(rows, total, colors ?? DEFAULT_COLORS)
  const unitLabel = unit === 'patients' ? (en ? 'patients' : 'пациентов') : en ? 'phases' : 'фаз'

  return (
    <figure className="space-y-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        <svg
          viewBox="0 0 200 200"
          role="img"
          aria-label={title}
          className="h-48 w-48 shrink-0 self-center"
        >
          <title>{title}</title>
          {slices
            .filter((row) => row.count > 0)
            .map((row) => {
              const label = `${row.label}: ${row.count} (${fmt1(row.pct)}%)`
              return row.count === total ? (
                <circle key={row.value} cx="100" cy="100" r="96" fill={row.color}>
                  <title>{label}</title>
                </circle>
              ) : (
                <path key={row.value} d={row.path} fill={row.color}>
                  <title>{label}</title>
                </path>
              )
            })}
          <circle key="all" cx="100" cy="100" r="92" fill="#ffffff50"></circle>
          <circle key="center" cx="100" cy="100" r="40" fill="#ffffff"></circle>
        </svg>
        <ul className="min-w-0 flex-1 space-y-2 text-sm">
          {slices.map((row) => (
            <li key={row.value} className="flex items-baseline gap-2">
              <span
                aria-hidden="true"
                className="h-3 w-3 shrink-0 rounded-sm"
                style={{ backgroundColor: row.color }}
              />
              <span className="min-w-0 flex-1">{row.label}</span>
              <span className="shrink-0 text-neutral-700 tabular-nums">
                <b className="inline-block" style={{ backgroundColor: row.color }}>
                  <span className="bg-white/50" style={{ padding: '0 0.2rem' }}>
                    {fmt1(row.pct)}%{' '}
                  </span>
                </b>{' '}
                <span className="inline-block min-w-10 text-neutral-500">{row.count}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <figcaption className="text-xs text-neutral-500">
        {en
          ? `Recorded values: ${total} ${unitLabel}. Percentages exclude missing values.`
          : `С заполненным значением: ${total} ${unitLabel}. Доли рассчитаны без пропусков.`}
      </figcaption>
    </figure>
  )
}
