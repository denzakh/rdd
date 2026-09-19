import { describe, expect, it } from 'vitest'
import { validateCellValue } from '@/widgets/matrix/model/validate'
import { FLAT_REGISTRY } from '@/shared/config/registry'
import type { RegistryField } from '@/shared/config/registry/types'

const birthYear = FLAT_REGISTRY.birth_year as RegistryField

describe('validate: validateCellValue', () => {
  it('null и пустая строка всегда валидны', () => {
    expect(validateCellValue(birthYear, null)).toBeUndefined()
    expect(validateCellValue(birthYear, '')).toBeUndefined()
  })

  it('значение в диапазоне — валидно', () => {
    expect(validateCellValue(birthYear, 1985)).toBeUndefined()
  })

  it('значение вне min/max из реестра — ошибка', () => {
    expect(validateCellValue(birthYear, 1800)).toBeDefined()
  })

  it('main_component=0 («Отсутствует») — валиден как число', () => {
    const mainComponent = FLAT_REGISTRY.main_component as RegistryField
    expect(validateCellValue(mainComponent, 0)).toBeUndefined()
  })

  it('main_component="0" (строка вместо числа) — ошибка типа', () => {
    const mainComponent = FLAT_REGISTRY.main_component as RegistryField
    expect(validateCellValue(mainComponent, '0' as unknown as number)).toBeDefined()
  })

  it('несуществующее в схеме поле — валидно (нет валидатора)', () => {
    const ghost = { ...birthYear, id: 'no_such_field' } as RegistryField
    expect(validateCellValue(ghost, 123)).toBeUndefined()
  })
})
