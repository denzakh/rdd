import { FLAT_REGISTRY } from '@/shared/config/registry'
import type { RegistryField } from '@/shared/config/registry/types'

// Определяем, какие поля имеют исполнимый calculate и к какому scope относятся.
type ComputedMeta = RegistryField & {
  id: string
  calculate: (...args: any[]) => any
  scope: 'patient' | 'phase'
}

const computedFields: ComputedMeta[] = Object.values(FLAT_REGISTRY).filter(
  (f) => typeof (f as RegistryField).calculate === 'function'
) as ComputedMeta[]

/**
 * Обогащает строку БД вычисляемыми (не хранимыми) полями реестра.
 *
 * Каждая функция `calculate` вызывается с накапливаемым объектом `out`,
 * поэтому производные поля могут зависеть от ранее вычисленных
 * (`age_group` зависит от `current_age`). Строковые `calculate`
 * (`'array_index + 1'` и т.п.) игнорируются — это исходные спеки,
 * а не исполнимый код.
 *
 * @param row    хранимая строка БД (PatientRow/PhaseRow без вычисляемых полей)
 * @param scope  каких полей считаем (patient или phase)
 */
export function applyComputed<T extends Record<string, unknown>>(
  row: T,
  scope: 'patient' | 'phase'
): T & Record<string, unknown> {
  const out: Record<string, unknown> = { ...row }

  for (const field of computedFields) {
    if (field.scope !== scope) continue
    try {
      // Передаём накапливаемый объект: производные поля могут зависеть
      // от ранее вычисленных (age_group зависит от current_age).
      out[field.id] = field.calculate(out)
    } catch {
      // Не роняем чтение из-за единичного производного поля
      out[field.id] = undefined
    }
  }

  return out as T & Record<string, unknown>
}
export type { ComputedMeta }