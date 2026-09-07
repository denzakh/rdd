import { describe, expect, it } from 'vitest'
import { generateSchema } from '@/shared/lib/registry/to-zod'
import { FLAT_REGISTRY } from '@/shared/config/registry'
import type { RegistryField } from '@/shared/config/registry/types'

const REGISTRY_MAP = FLAT_REGISTRY as unknown as Record<string, RegistryField>

const field = (id: string): RegistryField => REGISTRY_MAP[id]

const findField = (dbType: string): RegistryField =>
  Object.values(REGISTRY_MAP).find((f) => f.db_type === dbType) as RegistryField

describe('to-zod: генерация схемы из реестра', () => {
  it('schema.shape содержит все поля реестра', () => {
    const schema = generateSchema()
    for (const key of Object.keys(FLAT_REGISTRY)) {
      expect(schema.shape[key]).toBeDefined()
    }
  })

  it('INTEGER: применяются min/max из реестра', () => {
    const schema = generateSchema()
    const numeric = Object.values(FLAT_REGISTRY).find(
      (f) => (f as RegistryField).db_type === 'INTEGER' && (f as RegistryField).min !== undefined
    ) as RegistryField
    expect(numeric).toBeDefined()

    const validator = schema.shape[numeric.id]
    expect(validator.safeParse((numeric.min as number) - 1).success).toBe(false)
    expect(validator.safeParse((numeric.max as number) + 1).success).toBe(false)
    expect(validator.safeParse(numeric.min).success).toBe(true)
  })

  it('FLOAT: дробные значения валидны, строки — нет', () => {
    const schema = generateSchema()
    const floatField = findField('FLOAT')
    const validator = schema.shape[floatField.id]
    expect(validator.safeParse(3.5).success).toBe(true)
    expect(validator.safeParse('3.5').success).toBe(false)
  })

  it('BOOLEAN: coerce 0/1 → false/true', () => {
    const schema = generateSchema()
    const boolField = findField('BOOLEAN')
    const validator = schema.shape[boolField.id]
    expect(validator.safeParse(1).success).toBe(true)
    expect(validator.safeParse(0).success).toBe(true)
  })

  it('DATE: ISO-строки валидны, числа — нет', () => {
    const schema = generateSchema()
    const dateField = findField('DATE')
    const validator = schema.shape[dateField.id]
    expect(validator.safeParse('2024-03-01').success).toBe(true)
    expect(validator.safeParse(42).success).toBe(false)
  })

  it('nullable/optional: null и undefined проходят для любого поля', () => {
    const schema = generateSchema()
    const anyField = Object.keys(FLAT_REGISTRY)[0] as string
    expect(schema.shape[anyField].safeParse(null).success).toBe(true)
    expect(schema.shape[anyField].safeParse(undefined).success).toBe(true)
  })

  it('конкретное поле реестра: birth_year 1800 отклоняется (min 1900)', () => {
    const schema = generateSchema()
    const birth = field('birth_year')
    expect(birth.db_type).toBe('INTEGER')
    expect(schema.shape.birth_year.safeParse(1800).success).toBe(false)
    expect(schema.shape.birth_year.safeParse(1980).success).toBe(true)
  })
})
