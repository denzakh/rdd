'use client'

/**
 * Панель выгрузки де-идентифицированного датасета (csv/json/xlsx).
 * Клиент вызывает Server Action exportDeidentified и скачивает base64.
 */
import { useState, useTransition } from 'react'
import { exportDeidentified, type ExportFormat, type ExportResult } from '../api/actions'

const FORMATS: Array<{ id: ExportFormat; label: string; hint: string }> = [
  { id: 'csv', label: 'CSV', hint: 'R / Python / pandas' },
  { id: 'json', label: 'JSON', hint: 'скрипты, API-импорт' },
  { id: 'xlsx', label: 'XLSX', hint: 'Excel / LibreOffice' },
]

function download(result: ExportResult): void {
  const bytes = Uint8Array.from(atob(result.base64), (c) => c.charCodeAt(0))
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: result.mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = result.filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function ExportPanel() {
  const [pending, start] = useTransition()
  const [last, setLast] = useState<ExportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = (format: ExportFormat): void => {
    setError(null)
    start(async () => {
      try {
        const result = await exportDeidentified(format)
        setLast(result)
        download(result)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка экспорта')
      }
    })
  }

  return (
    <section className="space-y-3 rounded-md border border-neutral-300 p-4">
      <h2 className="text-sm font-semibold">Выгрузка для статистики (де-идентифицированная)</h2>
      <p className="text-xs text-neutral-600">
        Без прямых идентификаторов: вместо id — номер исследования (seq_id), вместо дат — возрастная
        группа и месяцы от включения. Малые группы (k&lt;5) подавлены.
      </p>
      <div className="flex flex-wrap gap-2">
        {FORMATS.map((f) => (
          <button
            key={f.id}
            type="button"
            disabled={pending}
            onClick={() => run(f.id)}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 disabled:opacity-50"
            title={f.hint}
          >
            {pending ? '…' : `Скачать ${f.label}`}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-700">{error}</p>}
      {last && (
        <p className="text-xs text-neutral-600">
          {last.filename}: пациентов {last.patients}, строк {last.rowsExported} из {last.rowsTotal}
          {last.suppressedRows > 0 && ` (подавлено ${last.suppressedRows} по k=${last.k})`}
        </p>
      )}
    </section>
  )
}
