import { phaseSchema } from '@/shared/lib/registry'
import type { RegistryField } from '@/shared/config'
import type { FieldValue } from './types'

/**
 * Валидация значения ячейки по Zod-схеме, сгенерированной из реестра
 * (`to-zod`, §1.1 спеки: zod используется для валидации, RHF — нет).
 */
export function validateCellValue(field: RegistryField, value: FieldValue): string | undefined {
  if (value === null || value === '') return undefined
  const validator = phaseSchema.shape[field.id]
  if (!validator) return undefined
  const result = validator.safeParse(value)
  if (result.success) return undefined
  return result.error.issues[0]?.message ?? 'Некорректное значение'
}
