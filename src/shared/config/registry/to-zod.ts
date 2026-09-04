import { z } from 'zod'
import { FLAT_REGISTRY } from '@/shared/config/registry'

export const generateSchema = () => {
  const shape: any = {}

  Object.entries(FLAT_REGISTRY).forEach(([key, field]: [string, any]) => {
    let validator

    switch (field.db_type) {
      case 'BOOLEAN':
        validator = z.coerce.boolean() // coerce поможет преобразовать 0/1 из БД в boolean
        break
      case 'INTEGER':
      case 'FLOAT':
        validator = z.number()
        break
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

    // Если поле не обязательное или может быть -1 (хотя мы решили бинарно)
    shape[key] = field.required ? validator : validator.optional().nullable()
  })

  return z.object(shape)
}

export const phaseSchema = generateSchema()
