'use client'

import { memo, useCallback, useRef } from 'react'
import type { RegistryField, RegistryOption } from '@/shared/config/registry/types'
import type { FieldValue } from '../types'

export interface MatrixCellProps {
  phaseId: string
  fieldId: string
  ui: RegistryField['ui']
  value: FieldValue
  disabled: boolean
  error?: string
  options?: readonly RegistryOption[]
  onChange: (phaseId: string, fieldId: string, value: FieldValue) => void
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
  options,
  onChange,
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
          return <span className="text-xs">{renderBadge(value, options)}</span>
        }
        return (
          <select
            defaultValue={value === null ? '' : String(value)}
            onChange={(e) =>
              commit(e.target.value === '' ? null : Number(e.target.value) || e.target.value)
            }
            className={`h-7 w-full rounded border border-neutral-300 bg-white px-1 text-xs ${ring}`}
          >
            <option value="">—</option>
            {options?.map((o) => (
              <option key={String(o.value)} value={String(o.value)}>
                {o.label}
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
      className={`flex h-full w-full items-center px-2 ${error ? 'bg-red-50' : ''}`}
      title={error ?? undefined}
    >
      {control}
    </div>
  )
}

function renderBadge(value: FieldValue, options?: readonly RegistryOption[]): string {
  if (value === null || value === undefined) return '—'
  if (options) {
    const match = options.find((o) => String(o.value) === String(value))
    if (match) return match.label
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
    prev.options === next.options
)
