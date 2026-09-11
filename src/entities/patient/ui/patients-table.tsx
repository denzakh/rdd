import Link from 'next/link'
import type { PatientRow } from '@/shared/api'
import { REGISTRY } from '@/shared/config'
import type { RegistryField } from '@/shared/config'
import { fieldLabel, optionLabel, type Locale } from '@/shared/lib/intl'

/** Заголовки таблицы — из реестра (паспортная часть). */
const COLUMNS = ['id', 'study_entry_date', 'birth_year', 'gender', 'education_level'] as const

function cellLabel(fieldId: string, row: PatientRow, locale: Locale = 'ru'): string {
  const value = (row as unknown as Record<string, unknown>)[fieldId]
  if (value === null || value === undefined) return '—'
  const field = (REGISTRY.patient as Record<string, RegistryField>)[fieldId]
  const opt = field?.options?.find((o) => String(o.value) === String(value))
  return opt ? optionLabel(opt, locale) : String(value)
}

/** Таблица пациентов (/patients). Серверный компонент. */
export function PatientsTable({
  patients,
  locale = 'ru',
}: {
  patients: PatientRow[]
  locale?: Locale
}) {
  if (patients.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        {locale === 'en' ? 'No patients found.' : 'Пациентов не найдено.'}
      </p>
    )
  }
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
          {COLUMNS.map((c) => (
            <th key={c} className="px-2 py-1.5 font-medium">
              {c === 'id'
                ? 'ID'
                : fieldLabel(
                    REGISTRY.patient[c as keyof typeof REGISTRY.patient] as RegistryField,
                    locale
                  )}
            </th>
          ))}
          <th className="px-2 py-1.5" />
        </tr>
      </thead>
      <tbody>
        {patients.map((p) => (
          <tr key={p.id} className="border-b border-neutral-100 hover:bg-neutral-50">
            {COLUMNS.map((c) => (
              <td key={c} className="px-2 py-1.5">
                {c === 'id' ? `#${p.id}` : cellLabel(c, p, locale)}
              </td>
            ))}
            <td className="px-2 py-1.5 text-right">
              <div className="flex justify-end gap-4">
                <Link href={`/patients/${p.id}`} className="text-xs text-blue-700 hover:underline">
                  {locale === 'en' ? 'Open' : 'Открыть'}
                </Link>
                <Link
                  href={`/patients/${p.id}/edit`}
                  className="text-xs text-blue-700 hover:underline"
                >
                  {locale === 'en' ? 'Edit' : 'Редактировать'}
                </Link>
                <Link
                  href={`/patients/${p.id}/matrix`}
                  className="text-xs text-blue-700 hover:underline"
                >
                  {locale === 'en' ? 'Phases' : 'Фазы'}
                </Link>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
