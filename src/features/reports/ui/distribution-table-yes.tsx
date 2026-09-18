import type { Locale } from '@/shared/lib/intl'

import { fmt1 } from './distribution-table'

/**
 * Строка таблицы «да/нет»-признаков: название признака и число записей
 * с признаком («да»).
 */
export interface YesFeatureRow {
  /** Название признака (строка таблицы). */
  label: string
  /** Абсолютное число записей с признаком («да»). */
  yes: number
  /** Число записей с заполненным признаком (знаменатель для «% да»). */
  total: number
}

/**
 * Собирает одну строку YesFeatureRow из распределения значений 0/1
 * (такого как familyHistory): «да» — строка со значением yesValue
 * (по умолчанию 1), знаменатель — все записи (NULL уже отфильтрованы
 * в запросах).
 */
export function yesFeatureRow(
  values: Array<{ value: number; count: number }>,
  label: string,
  yesValue = 1
): YesFeatureRow {
  const yes = values.find((r) => r.value === yesValue)?.count ?? 0
  const total = values.reduce((s, r) => s + r.count, 0)
  return { label, yes, total }
}

interface DistributionTableYesProps {
  rows: YesFeatureRow[]
  locale: Locale
  /** Единица строки таблицы (пациенты / фазы). */
  unit?: 'patients' | 'phases'
}

/**
 * Таблица «да/нет»-признаков: каждая строка — название признака,
 * «% да» (доля записей с признаком от заполненных) и абсолютное число «да».
 * Серверный рендер, без JS, подходит для /reports.
 */
export function DistributionTableYes({
  rows,
  locale,
  unit = 'patients',
}: DistributionTableYesProps) {
  const en = locale === 'en'
  const filled = rows.reduce((s, r) => s + r.total, 0)

  if (rows.length === 0 || filled === 0) {
    return <p className="text-xs text-neutral-500">{en ? 'No data' : 'Нет данных'}</p>
  }

  const unitLabel = unit === 'phases' ? (en ? 'phases' : 'фаз') : en ? 'patients' : 'пациентов'

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-neutral-500">
          <th className="py-1 pl-0">{en ? 'Feature' : 'Название'}</th>
          <th className="py-1 text-right">{en ? 'Yes, %' : '% да'}</th>
          <th className="py-1 text-right">
            {en ? `Yes, abs (${unitLabel})` : `Абс. число да (${unitLabel})`}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const pct = r.total > 0 ? (r.yes / r.total) * 100 : 0
          return (
            <tr key={r.label}>
              <td className="py-1.5">{r.label}</td>
              <td className="py-1.5 text-right whitespace-nowrap text-neutral-700 tabular-nums">
                {fmt1(pct)}%
              </td>
              <td className="py-1.5 text-right whitespace-nowrap text-neutral-700 tabular-nums">
                {r.yes}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
