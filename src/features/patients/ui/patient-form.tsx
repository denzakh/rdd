'use client'

/**
 * Форма паспортной части пациента: поля рендерятся из REGISTRY.patient
 * по field.ui (docs/spec-stage-2.md §4). Отправка через useActionState
 * → savePatientAction (создание или обновление, если передан patient).
 */
import { useActionState } from 'react'
import { REGISTRY } from '@/shared/config'
import type { RegistryField } from '@/shared/config'
import { fieldLabel, optionLabel } from '@/shared/lib/intl'
import { savePatientAction, type PatientActionState } from '../api/actions'

const EDITABLE_UI = new Set([
  'date-picker',
  'number-input',
  'select',
  'radio-group',
  'toggle-binary',
  'checkbox',
])

function ruLabel(field: RegistryField): string {
  return fieldLabel(field, 'ru')
}

export function PatientForm({ patient }: { patient?: Record<string, unknown> | undefined }) {
  const [state, formAction, pending] = useActionState<PatientActionState, FormData>(
    savePatientAction,
    {}
  )
  const err = (id: string) => state.fieldErrors?.includes(id)

  return (
    <form action={formAction} className="max-w-xl space-y-3">
      {patient?.id !== undefined && patient?.id !== null && (
        <input type="hidden" name="id" value={String(patient.id)} />
      )}
      {(Object.values(REGISTRY.patient) as RegistryField[])
        .filter((f) => EDITABLE_UI.has(f.ui) && typeof f.calculate !== 'function')
        .map((field) => (
          <label key={field.id} className="block text-sm">
            <span className="mb-0.5 block text-neutral-600">{ruLabel(field)}</span>
            <FieldInput
              field={field}
              value={patient?.[field.id]}
              hasError={Boolean(err(field.id))}
            />
          </label>
        ))}

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-4 py-1.5 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
      >
        {pending ? 'Сохранение…' : 'Сохранить'}
      </button>
    </form>
  )
}

function FieldInput({
  field,
  value,
  hasError,
}: {
  field: RegistryField
  value: unknown
  hasError: boolean
}) {
  const ring = hasError ? 'ring-1 ring-red-500' : ''
  const v = value === null || value === undefined ? '' : String(value)

  switch (field.ui) {
    case 'date-picker':
      return (
        <input
          type="date"
          name={field.id}
          defaultValue={v ? v.slice(0, 10) : ''}
          className={`h-8 w-full rounded border border-neutral-300 px-2 text-sm ${ring}`}
        />
      )
    case 'number-input':
      return (
        <input
          type="number"
          name={field.id}
          defaultValue={v}
          min={field.min}
          max={field.max}
          className={`h-8 w-full rounded border border-neutral-300 px-2 text-sm ${ring}`}
        />
      )
    case 'select':
      return (
        <select
          name={field.id}
          defaultValue={v}
          className={`h-8 w-full rounded border border-neutral-300 bg-white px-2 text-sm ${ring}`}
        >
          <option value="">—</option>
          {field.options?.map((o) => (
            <option key={String(o.value)} value={String(o.value)}>
              {optionLabel(o, 'ru')}
            </option>
          ))}
        </select>
      )
    case 'radio-group':
      return (
        <div className="flex gap-4">
          {field.options?.map((o) => (
            <label key={String(o.value)} className="flex items-center gap-1 text-sm">
              <input
                type="radio"
                name={field.id}
                value={String(o.value)}
                defaultChecked={v === String(o.value)}
              />
              {optionLabel(o, 'ru')}
            </label>
          ))}
        </div>
      )
    case 'toggle-binary':
    case 'checkbox':
      return (
        <input
          type="checkbox"
          name={field.id}
          value="1"
          defaultChecked={v === '1'}
          className="h-4 w-4 accent-neutral-900"
        />
      )
    default:
      return (
        <input
          type="text"
          name={field.id}
          defaultValue={v}
          className={`h-8 w-full rounded border border-neutral-300 px-2 text-sm ${ring}`}
        />
      )
  }
}
