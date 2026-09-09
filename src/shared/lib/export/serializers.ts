/**
 * Слой сериализации де-идентифицированного датасета (docs/export.md).
 * ИНВАРИАНТ: сюда попадают ТОЛЬКО очищенные объекты из getDeidentifiedDataset.
 * Адаптеры PII не знают и не фильтруют — маскирование уже выполнено.
 */
import type { DeidentifiedDataset } from './types'

const csvCell = (v: number | null | undefined): string => {
  if (v === null || v === undefined) return ''
  const s = String(v)
  return /[",\r\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** CSV (RFC 4180, запятая — для R/Python/pandas). */
export function toCsv(data: DeidentifiedDataset): string {
  const { columns, rows } = data
  const lines = [columns.join(',')]
  for (const r of rows) {
    lines.push(columns.map((c) => csvCell((r as Record<string, number | null>)[c])).join(','))
  }
  return lines.join('\r\n') + '\r\n'
}

/** JSON: { meta, columns, rows } со стабильным порядком ключей. */
export function toJson(data: DeidentifiedDataset): string {
  const { columns, rows, meta } = data
  const ordered = rows.map((r) => {
    const o: Record<string, number | null> = {}
    for (const c of columns) o[c] = (r as Record<string, number | null>)[c] ?? null
    return o
  })
  return JSON.stringify({ meta, columns, rows: ordered }, null, 2)
}

/** MIME + имя файла для формата экспорта. */
export function exportFileMeta(format: 'csv' | 'json' | 'xlsx'): {
  mime: string
  filename: string
} {
  const stamp = new Date().toISOString().slice(0, 10)
  switch (format) {
    case 'json':
      return { mime: 'application/json; charset=utf-8', filename: `rdd-deidentified-${stamp}.json` }
    case 'xlsx':
      return {
        mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: `rdd-deidentified-${stamp}.xlsx`,
      }
    default:
      return { mime: 'text/csv; charset=utf-8', filename: `rdd-deidentified-${stamp}.csv` }
  }
}
