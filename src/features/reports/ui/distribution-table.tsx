import type { Locale } from '@/shared/lib/intl'

/**
 * Строка распределения для отображения.
 */
export interface DistributionRow {
  value: number
  label: string
  count: number
}

/** Цвет баров (только уже используемая в проекте палитра). */
export type Accent = 'neutral' | 'amber' | 'green'

/** Округление до 1 знака без висячего «.0». */
export const fmt1 = (x: number): string => {
  const r = Math.round(x * 10) / 10
  return Number.isInteger(r) ? String(r) : r.toFixed(1)
}

const ACCENTS: Record<Accent, string> = {
  neutral: 'bg-neutral-700',
  amber: 'bg-amber-400',
  green: 'bg-green-600',
}

interface DistributionTableProps {
  rows: DistributionRow[]
  locale: Locale
  /** Единица строки таблицы (пациенты / фазы). */
  unit?: 'patients' | 'phases'
  /** Цвет баров (уже используемая палитра проекта). */
  accent?: Accent
}

/**
 * Таблица распределения с горизонтальными барами (серверный рендер, без JS,
 * подходит для /reports). Бар — доля строки от максимального значения,
 * справа — «абс (%)». NULL-строки в rows уже отфильтрованы в запросах.
 */
export function DistributionTable({
  rows,
  locale,
  unit = 'patients',
  accent = 'green',
}: DistributionTableProps) {
  const en = locale === 'en'
  const total = rows.reduce((s, r) => s + r.count, 0)
  const max = rows.reduce((m, r) => Math.max(m, r.count), 0)
  const bar = ACCENTS[accent]

  if (rows.length === 0 || total === 0) {
    return <p className="text-xs text-neutral-500">{en ? 'No data' : 'Нет данных'}</p>
  }

  const unitLabel = unit === 'phases' ? (en ? 'phases' : 'фаз') : en ? 'patients' : 'пациентов'

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-neutral-500">
          <th className="py-1 pl-0">{en ? 'Value' : 'Признак'}</th>
          <th className="w-full" />
          <th className="py-1 text-right">
            {en ? `Count (%) of ${unitLabel}` : `Кол-во (%) ${unitLabel}`}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const pct = total > 0 ? (r.count / total) * 100 : 0
          const width = max > 0 ? `${(r.count / max) * 100}%` : '0%'
          return (
            <tr key={r.value}>
              <td className="py-1.5">{r.label}</td>
              <td className="py-1.5">
                <div className="h-3 overflow-hidden rounded bg-neutral-200">
                  <div className={`h-3 rounded ${bar}`} style={{ width }} />
                </div>
              </td>
              <td className="py-1.5 text-right whitespace-nowrap text-neutral-700 tabular-nums">
                {r.count} ({fmt1(pct)}%)
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
