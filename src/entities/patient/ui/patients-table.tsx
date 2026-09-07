import Link from 'next/link'
import type { PatientRow } from '@/shared/api'
import { REGISTRY } from '@/shared/config'

/** Заголовки таблицы — из реестра (паспортная часть). */
const COLUMNS = ['id', 'study_entry_date', 'birth_year', 'gender', 'education_level'] as const

function cellLabel(fieldId: string, row: PatientRow): string {
  const value = (row as unknown as Record<string, unknown>)[fieldId]
  if (value === null || value === undefined) return '—'
  const field = (
    REGISTRY.patient as Record<string, { options?: Array<{ value: number; label: string }> }>
  )[fieldId]
  const opt = field?.options?.find((o) => String(o.value) === String(value))
  return opt ? opt.label : String(value)
}

/** Таблица пациентов (/patients). Серверный компонент. */
export function PatientsTable({ patients }: { patients: PatientRow[] }) {
  if (patients.length === 0) {
    return <p className="text-sm text-neutral-500">Пациентов не найдено.</p>
  }
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
          {COLUMNS.map((c) => (
            <th key={c} className="px-2 py-1.5 font-medium">
              {c === 'id' ? 'ID' : ruLabel(c)}
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
                {c === 'id' ? `#${p.id}` : cellLabel(c, p)}
              </td>
            ))}
            <td className="px-2 py-1.5 text-right">
              <Link href={`/patients/${p.id}`} className="text-xs text-blue-700 hover:underline">
                Открыть →
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ruLabel(fieldId: string): string {
  const field = REGISTRY.patient[fieldId as keyof typeof REGISTRY.patient]
  if (!field) return fieldId
  return typeof field.label === 'string' ? field.label : field.label.ru
}
