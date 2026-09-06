import { z } from 'zod'
import { FLAT_REGISTRY } from '@/shared/config/registry'
import type { RegistryField } from '@/shared/config/registry/types'

/**
 * Динамическая генерация Zod-схемы из плоского реестра полей
 * (см. раздел 4.2 rdd-v1.md). Поле `db_type` определяет валидатор.
 */
export const generateSchema = () => {
  const shape: Record<string, z.ZodTypeAny> = {}

  Object.entries(FLAT_REGISTRY).forEach(([key, value]) => {
    const field = value as RegistryField
    const dbType = field.db_type

    let validator: z.ZodTypeAny
    switch (dbType) {
      case 'BOOLEAN':
        // coerce поможет преобразовать 0/1 из БД в boolean
        validator = z.coerce.boolean()
        break
      case 'INTEGER':
      case 'FLOAT': {
        let n = z.number()
        // Применяем констрinты из реестра (min/max), если заданы
        if (field.min !== undefined) n = n.min(field.min)
        if (field.max !== undefined) n = n.max(field.max)
        validator = n
        break
      }
      case 'DATE':
        // Позволяем и объект даты, и строку (ISO)
        validator = z.union([z.date(), z.string().datetime().or(z.string())])
        break
      case 'TEXT':
        validator = z.string()
        break
      default:
        validator = z.any()
    }

    // Поля без явного db_type (вычисляемые/id) тоже оставляем nullable-optional
    shape[key] = validator.optional().nullable()
  })

  return z.object(shape)
}

export const phaseSchema = generateSchema()
