import { REGISTRY } from '@/shared/config'
import type { RegistryField } from '@/shared/config'
import type { PatientRow } from '@/shared/api'
import { applyComputed } from '@/shared/api'
import { fieldLabel, optionLabel, type Locale } from '@/shared/lib/intl'

/**
 * Карточка пациента: паспортная часть из реестра + вычисляемые поля
 * (current_age, age_group через applyComputed). Серверный компонент.
 */
export function PatientCard({ patient, locale = 'ru' }: { patient: PatientRow; locale?: Locale }) {
  const enriched = applyComputed(patient as unknown as Record<string, unknown>, 'patient')

  return (
    <dl className="grid grid-cols-[minmax(200px,320px)_1fr] gap-x-4 gap-y-1 text-sm">
      {Object.values(REGISTRY.patient).map((_field) => {
        const field = _field as RegistryField
        const label = fieldLabel(field, locale)
        const raw = enriched[field.id]
        let display = '—'
        if (raw !== null && raw !== undefined) {
          const opt = field.options?.find((o) => String(o.value) === String(raw))
          display = opt ? optionLabel(opt, locale) : String(raw)
        }
        return (
          <div key={field.id} className="contents">
            <dt className="py-1 text-neutral-500">{label}</dt>
            <dd className="py-1">{display}</dd>
          </div>
        )
      })}
    </dl>
  )
}
