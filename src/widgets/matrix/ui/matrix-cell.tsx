'use client'

import { memo, useCallback, useRef, useState } from 'react'
import type { RegistryField, RegistryOption } from '@/shared/config'
import { optionLabel, type Locale } from '@/shared/lib/intl'
import type { FieldValue } from '../model/types'
import type { CellConflict } from '../model/matrix-store'

export interface MatrixCellProps {
  phaseId: string
  fieldId: string
  ui: RegistryField['ui']
  value: FieldValue
  disabled: boolean
  error?: string
  conflict?: CellConflict
  options?: readonly RegistryOption[]
  /** Локаль подписей опций (по дефолту ru — фолбэк, docs/en/i18n.md §3). */
  locale?: Locale
  onChange: (phaseId: string, fieldId: string, value: FieldValue) => void
  onResolveConflict: (phaseId: string, fieldId: string, resolution: 'mine' | 'theirs') => void
}

/**
 * Фабрика рендеринга ячейки (§3 спеки): выбирает UI-контроллер по `ui`.
 * Текстовые инпуты — uncontrolled (draft в DOM), коммит по onBlur или
 * дебаунсу 300ms (§2.2). Бинарные поля и select коммитятся сразу.
 */
function MatrixCellBase({
  phaseId,
  fieldId,
  ui,
  value,
  disabled,
  error,
  conflict,
  options,
  locale = 'ru',
  onChange,
  onResolveConflict,
}: MatrixCellProps) {
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const commit = useCallback(
    (v: FieldValue) => onChange(phaseId, fieldId, v),
    [phaseId, fieldId, onChange]
  )

  const commitDebounced = useCallback(
    (v: FieldValue) => {
      if (commitTimer.current) clearTimeout(commitTimer.current)
      commitTimer.current = setTimeout(() => commit(v), 300)
    },
    [commit]
  )

  const ring = error ? 'ring-1 ring-red-500' : ''

  const control = (() => {
    switch (ui) {
      case 'checkbox':
      case 'toggle-binary':
        return (
          <input
            type="checkbox"
            checked={value === 1 || value === true}
            disabled={disabled}
            onChange={(e) => commit(e.target.checked ? 1 : 0)}
            className="h-4 w-4 accent-neutral-900"
          />
        )

      case 'select':
      case 'radio-group':
      case 'select-readonly':
        if (ui === 'select-readonly' || disabled) {
          return <span className="text-xs">{renderBadge(value, options, locale)}</span>
        }
        return (
          <select
            defaultValue={value === null ? '' : String(value)}
            onChange={(e) => {
              const raw = e.target.value
              if (raw === '') {
                commit(null)
                return
              }
              // Совпадение с опцией реестра — коммитим каноническое значение
              // (сохраняет тип number|string из RegistryOption).
              const match = options?.find((o) => String(o.value) === raw)
              if (match !== undefined) {
                commit(match.value as FieldValue)
                return
              }
              // Фолбэк: числовые строки → number (включая "0"),
              // иначе — как есть. Старый вариант
              // `Number(raw) || raw` превращал "0" в строку "0"
              // (0 — falsy), и Zod (z.number) отклонял её как «ошибка типа».
              commit(raw.trim() !== '' && !Number.isNaN(Number(raw)) ? Number(raw) : raw)
            }}
            className={`h-7 w-full rounded border border-neutral-300 bg-white px-1 text-xs ${ring}`}
          >
            <option value="">—</option>
            {options?.map((o) => (
              <option key={String(o.value)} value={String(o.value)}>
                {optionLabel(o, locale)}
              </option>
            ))}
          </select>
        )

      case 'date-picker':
        return (
          <input
            type="date"
            defaultValue={value === null ? '' : String(value)}
            disabled={disabled}
            onBlur={(e) => commitDebounced(e.target.value === '' ? null : e.target.value)}
            className={`h-7 w-full rounded border border-neutral-300 px-1 text-xs ${ring}`}
          />
        )

      case 'number-input':
      case 'number-readonly': {
        if (ui === 'number-readonly' || disabled) {
          return <span className="text-xs font-medium">{renderBadge(value)}</span>
        }
        return (
          <input
            type="number"
            defaultValue={value === null ? '' : String(value)}
            disabled={disabled}
            // no-spinners (§3 спеки)
            className={`h-7 w-full [appearance:textfield] rounded border border-neutral-300 px-1 text-xs [&::-webkit-inner-spin-button]:appearance-none ${ring}`}
            onBlur={(e) => commitDebounced(e.target.value === '' ? null : Number(e.target.value))}
          />
        )
      }

      case 'badge-readonly':
        return <span className="text-xs font-medium">{renderBadge(value)}</span>

      case 'text-input':
      default:
        if (disabled) return <span className="text-xs">{value === null ? '—' : String(value)}</span>
        return (
          <input
            type="text"
            defaultValue={value === null ? '' : String(value)}
            disabled={disabled}
            onBlur={(e) => commitDebounced(e.target.value === '' ? null : e.target.value)}
            className={`h-7 w-full rounded border border-neutral-300 px-1 text-xs ${ring}`}
          />
        )
    }
  })()

  return (
    <div
      className={`relative flex h-full w-full items-center px-2 ${error ? 'bg-red-50' : ''}`}
      title={conflict ? undefined : (error ?? undefined)}
    >
      {control}
      {conflict && (
        <ConflictBadge
          conflict={conflict}
          onResolve={onResolveConflict}
          phaseId={phaseId}
          fieldId={fieldId}
        />
      )}
    </div>
  )
}

/**
 * Мини-меню разрешения конфликта (§6.4): «Оставить моё / Принять значение
 * коллеги». Tooltip показывает дифф значений.
 */
function ConflictBadge({
  conflict,
  onResolve,
  phaseId,
  fieldId,
}: {
  conflict: CellConflict
  onResolve: (phaseId: string, fieldId: string, resolution: 'mine' | 'theirs') => void
  phaseId: string
  fieldId: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <span className="absolute top-0 right-0 z-20">
      <button
        type="button"
        title={`Ваше: ${String(conflict.mine ?? '—')} → Значение коллеги: ${String(conflict.theirs ?? '—')}`}
        onClick={() => setOpen((o) => !o)}
        className="h-3 w-3 rounded-full border border-amber-600 bg-amber-400"
        aria-label="Разрешить конфликт"
      />
      {open && (
        <span className="absolute top-4 right-0 z-30 flex flex-col gap-0.5 rounded border border-neutral-300 bg-white p-1 text-[10px] shadow-md">
          <button
            type="button"
            className="rounded px-1 py-0.5 text-left hover:bg-neutral-100"
            onClick={() => {
              onResolve(phaseId, fieldId, 'mine')
              setOpen(false)
            }}
          >
            Оставить моё ({String(conflict.mine ?? '—')})
          </button>
          <button
            type="button"
            className="rounded px-1 py-0.5 text-left hover:bg-neutral-100"
            onClick={() => {
              onResolve(phaseId, fieldId, 'theirs')
              setOpen(false)
            }}
          >
            Принять значение коллеги ({String(conflict.theirs ?? '—')})
          </button>
        </span>
      )}
    </span>
  )
}

function renderBadge(
  value: FieldValue,
  options?: readonly RegistryOption[],
  locale: Locale = 'ru'
): string {
  if (value === null || value === undefined) return '—'
  if (options) {
    const match = options.find((o) => String(o.value) === String(value))
    if (match) return optionLabel(match, locale)
  }
  if (typeof value === 'boolean') return value ? 'да' : 'нет'
  return String(value)
}

/**
 * Мемоизация (решение 3-A, §2.3 спеки): сравниваются все изменяемые
 * примитивные пропсы. `phaseId`/`fieldId`/`onChange` identity-стабильны
 * по построению (стабильный `commit` в гриде), поэтому не сравниваются.
 */
export const MatrixCell = memo(
  MatrixCellBase,
  (prev, next) =>
    prev.value === next.value &&
    prev.disabled === next.disabled &&
    prev.error === next.error &&
    prev.ui === next.ui &&
    prev.options === next.options &&
    prev.conflict === next.conflict
)
