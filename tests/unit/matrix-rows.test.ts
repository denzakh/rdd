import { describe, expect, it } from 'vitest'
import { buildMatrixRows, fieldLabel, isComputedField } from '@/widgets/matrix/model/matrix-rows'
import { REGISTRY, FLAT_REGISTRY } from '@/shared/config/registry'
import type { RegistryField } from '@/shared/config/registry/types'

describe('matrix-rows: buildMatrixRows', () => {
  it('первая строка — заголовок секции «Контроль фазы», секция patient не входит', () => {
    const rows = buildMatrixRows()
    expect(rows[0]).toEqual({ kind: 'section', sectionId: 'phase', title: 'Контроль фазы' })
    expect(rows.some((r) => r.kind === 'section' && r.sectionId === 'patient')).toBe(false)
  })

  it('порядок секций: phase, therapy, remission, status, diagnostic', () => {
    const sections = buildMatrixRows()
      .filter((r) => r.kind === 'section')
      .map((r) => (r as { sectionId: string }).sectionId)
    expect(sections).toEqual(['phase', 'therapy', 'remission', 'status', 'diagnostic'])
  })

  it('число field-строк равно числу полей секций, индексы последовательны', () => {
    const rows = buildMatrixRows()
    const fieldRows = rows.filter((r) => r.kind === 'field') as Array<
      Extract<(typeof rows)[number], { kind: 'field' }>
    >
    const totalRegistryFields =
      Object.values(REGISTRY.phase).length +
      Object.values(REGISTRY.therapy).length +
      Object.values(REGISTRY.remission).length +
      Object.values(REGISTRY.status).length +
      Object.values(REGISTRY.diagnostic).length
    expect(fieldRows).toHaveLength(totalRegistryFields)
    fieldRows.forEach((r, i) => {
      expect(r.index).toBe(i)
      expect(r.totalFields).toBe(totalRegistryFields)
    })
  })

  it('scopes-фильтр отбирает только указанные секции', () => {
    const rows = buildMatrixRows(['phase'])
    expect(rows[0]).toEqual({ kind: 'section', sectionId: 'phase', title: 'Контроль фазы' })
    expect(rows).toHaveLength(1 + Object.values(REGISTRY.phase).length)
  })
})

describe('matrix-rows: утилиты поля', () => {
  it('isComputedField: с calculate → true, без → false', () => {
    const computed = Object.values(FLAT_REGISTRY).find(
      (f) => typeof (f as RegistryField).calculate === 'function'
    ) as RegistryField | undefined
    const stored = Object.values(FLAT_REGISTRY).find(
      (f) => (f as RegistryField).calculate === undefined
    ) as RegistryField
    expect(computed).toBeDefined()
    expect(isComputedField(computed!)).toBe(true)
    expect(isComputedField(stored)).toBe(false)
  })

  it('fieldLabel: строка возвращается как есть, объект — по ru', () => {
    const labeled = Object.values(FLAT_REGISTRY).find(
      (f) => typeof (f as RegistryField).label === 'object'
    ) as RegistryField | undefined
    expect(labeled).toBeDefined()
    expect(fieldLabel(labeled!)).toBe((labeled!.label as { ru: string }).ru)
    expect(fieldLabel({ ...labeled!, label: 'Просто строка' })).toBe('Просто строка')
  })
})
