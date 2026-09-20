'use client'

/**
 * Панель выгрузки де-идентифицированного датасета (csv/json/xlsx).
 * Клиент вызывает Server Action exportDeidentified и скачивает base64.
 */
import { useState, useTransition } from 'react'
import { type Locale } from '@/shared/lib/intl'
import { exportDeidentified, type ExportFormat, type ExportResult } from '../api/actions'

const FORMATS: Array<{ id: ExportFormat; label: string; hint: string }> = [
  { id: 'csv', label: 'CSV', hint: 'R / Python / pandas' },
  { id: 'json', label: 'JSON', hint: 'скрипты, API-импорт' },
  { id: 'xlsx', label: 'XLSX', hint: 'Excel / LibreOffice' },
]

/**
 * Иконки форматов: лист с «начинкой» под формат (текст / код / таблица).
 * Инлайн-SVG без зависимостей: цвет — currentColor (наследует hover/disabled),
 * для скринридера скрыты (aria-hidden) — подпись кнопки уже несёт смысл.
 */
function FormatIcon({ format }: { format: ExportFormat }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.5 1.75H4.75A1.75 1.75 0 0 0 3 3.5v9a1.75 1.75 0 0 0 1.75 1.75h6.5A1.75 1.75 0 0 0 13 12.5V5.25L9.5 1.75Z" />
      <path d="M9.5 1.75v3.5H13" />
      {format === 'csv' && (
        <>
          <path d="M5.6 8.4h4.8" />
          <path d="M5.6 10.4h4.8" />
          <path d="M5.6 12.4h2.8" />
        </>
      )}
      {format === 'json' && (
        <>
          <path d="M6.9 8.3 5.2 10.4l1.7 2.1" />
          <path d="M9.1 8.3l1.7 2.1-1.7 2.1" />
        </>
      )}
      {format === 'xlsx' && (
        <>
          <path d="M5.6 8.4h4.8v4h-4.8z" />
          <path d="M5.6 10.4h4.8" />
          <path d="M8 8.4v4" />
        </>
      )}
    </svg>
  )
}

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

export function ExportPanel({ locale = 'ru' }: { locale?: Locale }) {
  const en = locale === 'en'
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
      <h2 className="text-sm font-semibold">
        {locale === 'en'
          ? 'De-identified dataset export'
          : 'Выгрузка для статистики (де-идентифицированная)'}
      </h2>
      <p className="text-xs text-neutral-600">
        {en
          ? 'No direct identifiers: instead of id — study number (seq_id), instead of dates — the patient age at the beginning of the phase.'
          : 'Без прямых идентификаторов: вместо id — номер исследования (seq_id), вместо дат — возраст пациента на момент начала фазы.'}
      </p>
      <div className="flex flex-wrap gap-2">
        {FORMATS.map((f) => (
          <button
            key={f.id}
            type="button"
            disabled={pending}
            onClick={() => run(f.id)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 disabled:opacity-50"
            title={f.hint}
          >
            <FormatIcon format={f.id} />
            {pending ? '…' : en ? `Download ${f.label}` : `Скачать ${f.label}`}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-700">{error}</p>}
      {last && (
        <p className="text-xs text-neutral-600">
          {en
            ? `${last.filename}: patients ${last.patients}, rows ${last.rowsTotal}`
            : `${last.filename}: пациентов ${last.patients}, строк ${last.rowsTotal}`}
        </p>
      )}
    </section>
  )
}
