import { REGISTRY } from '@/shared/config'
import type { RegistryField } from '@/shared/config'
import type { PatientRow } from '@/shared/api'
import { applyComputed } from '@/shared/api'

/**
 * Карточка пациента: паспортная часть из реестра + вычисляемые поля
 * (current_age, age_group через applyComputed). Серверный компонент.
 */
export function PatientCard({ patient }: { patient: PatientRow }) {
  const enriched = applyComputed(patient as unknown as Record<string, unknown>, 'patient')

  return (
    <dl className="grid grid-cols-[minmax(200px,320px)_1fr] gap-x-4 gap-y-1 text-sm">
      {Object.values(REGISTRY.patient).map((_field) => {
        const field = _field as RegistryField
        const label = typeof field.label === 'string' ? field.label : field.label.ru
        const raw = enriched[field.id]
        let display = '—'
        if (raw !== null && raw !== undefined) {
          const opt = field.options?.find((o) => String(o.value) === String(raw))
          display = opt ? opt.label : String(raw)
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
