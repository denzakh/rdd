import { describe, expect, it } from 'vitest'
import {
  buildMatrixRows,
  deprecatedTooltip,
  fieldLabel,
  isComputedField,
  isFieldRowHiddenForVersions,
} from '@/widgets/matrix/model/matrix-rows'
import { REGISTRY, FLAT_REGISTRY } from '@/shared/config/registry'
import type { RegistryField } from '@/shared/config/registry/types'

describe('matrix-rows: buildMatrixRows', () => {
  it('первая строка — заголовок секции «Контроль фазы», секция patient не входит', () => {
    const rows = buildMatrixRows()
    expect(rows[0]).toEqual({ kind: 'section', sectionId: 'phase', title: 'Контроль фазы' })
    expect(rows.some((r) => r.kind === 'section' && r.sectionId === 'patient')).toBe(false)
  })

  it('порядок секций: phase, status, diagnostic, therapy, remission', () => {
    const sections = buildMatrixRows()
      .filter((r) => r.kind === 'section')
      .map((r) => (r as { sectionId: string }).sectionId)
    expect(sections).toEqual(['phase', 'status', 'diagnostic', 'therapy', 'remission'])
  })

  it('число field-строк равно числу видимых полей секций, индексы последовательны', () => {
    const rows = buildMatrixRows()
    const fieldRows = rows.filter((r) => r.kind === 'field') as Array<
      Extract<(typeof rows)[number], { kind: 'field' }>
    >
    // hide_in_matrix-поля (Тип точки, Выраженность HAM-D, Чистая ремиссия,
    // Антидепрессанты (Факт)) в грид не попадают, но остаются
    // в реестре/словаре/applyComputed.
    const visibleCount = (section: keyof typeof REGISTRY): number =>
      Object.values(REGISTRY[section]).filter((f) => !(f as RegistryField).hide_in_matrix).length
    const totalRegistryFields =
      visibleCount('phase') +
      visibleCount('therapy') +
      visibleCount('remission') +
      visibleCount('status') +
      visibleCount('diagnostic')
    expect(fieldRows).toHaveLength(totalRegistryFields)
    fieldRows.forEach((r, i) => {
      expect(r.index).toBe(i)
      expect(r.totalFields).toBe(totalRegistryFields)
    })
  })

  it('hide_in_matrix: авто-дубли скрыты из грида', () => {
    const ids = buildMatrixRows()
      .filter((r) => r.kind === 'field')
      .map((r) => (r as { field: RegistryField }).field.id)
    const hiddenIds = ['phase_relative_id', 'hamd_severity', 'pure_remission', 'ad_any']
    for (const hidden of hiddenIds) {
      expect(ids).not.toContain(hidden)
      // поле остаётся в реестре (словарь/applyComputed/экспорт его видят)
      expect((FLAT_REGISTRY as unknown as Record<string, RegistryField>)[hidden]).toBeDefined()
    }
    // исходные чекбоксы АД остаются видимой строкой
    expect(ids).toContain('ad_tricyclic')
  })

  it('scopes-фильтр отбирает только указанные секции', () => {
    const rows = buildMatrixRows(['phase'])
    expect(rows[0]).toEqual({ kind: 'section', sectionId: 'phase', title: 'Контроль фазы' })
    const visiblePhase = Object.values(REGISTRY.phase).filter(
      (f) => !(f as RegistryField).hide_in_matrix
    ).length
    expect(rows).toHaveLength(1 + visiblePhase)
  })

  it('секция без подгрупп рендерится плоским списком (subheader-строк нет)', () => {
    const rows = buildMatrixRows(['phase'])
    expect(rows.some((r) => r.kind === 'subgroup')).toBe(false)
  })

  it('терапия: 5 subheader-строк в порядке THERAPY_GROUPS, поля идут после своей подгруппы', () => {
    const rows = buildMatrixRows(['therapy'])
    const subs = rows.filter((r) => r.kind === 'subgroup') as Array<
      Extract<(typeof rows)[number], { kind: 'subgroup' }>
    >
    expect(subs.map((s) => s.title)).toEqual([
      'Депрессогенный фон',
      'Соматическая поддержка',
      'Антидепрессанты: классы',
      'Курс АД: доза, путь, эффект',
      'Нейролептики и транквилизаторы',
    ])
    // beta_blockers — первое поле после «Депрессогенный фон», vitamins — после «Соматическая поддержка»
    const firstFieldIdx = (id: string) =>
      rows.findIndex((r) => r.kind === 'field' && r.field.id === id)
    const subIdx = (title: string) =>
      rows.findIndex((r) => r.kind === 'subgroup' && r.title === title)
    expect(firstFieldIdx('beta_blockers')).toBeGreaterThan(subIdx('Депрессогенный фон'))
    expect(firstFieldIdx('vitamins')).toBeGreaterThan(subIdx('Соматическая поддержка'))
    expect(firstFieldIdx('ad_tricyclic')).toBeGreaterThan(subIdx('Антидепрессанты: классы'))
    expect(firstFieldIdx('ad_dose_level')).toBeGreaterThan(subIdx('Курс АД: доза, путь, эффект'))
    expect(firstFieldIdx('nl_typical')).toBeGreaterThan(subIdx('Нейролептики и транквилизаторы'))
  })

  it('subheader-строки не влияют на field-индексы (index/totalFields считаются по полям)', () => {
    const rows = buildMatrixRows()
    const fieldRows = rows.filter((r) => r.kind === 'field')
    const totalFields = fieldRows.length
    fieldRows.forEach((r, i) => {
      expect(r.index).toBe(i)
      expect(r.totalFields).toBe(totalFields)
    })
  })

  it('EN-локаль: заголовки подгрупп локализованы', () => {
    const rows = buildMatrixRows(['therapy'], 'en')
    const subs = rows.filter((r) => r.kind === 'subgroup') as Array<{
      title: string
    }>
    expect(subs[0].title).toBe('Depressogenic background')
    expect(subs[4].title).toBe('Antipsychotics & tranquilizers')
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

  it('deprecatedTooltip: «Устарело с версии N» + «См. вместо: label replacedBy»', () => {
    // replacedBy резолвится по реестру — берём реальное существующее поле
    const replacementId = Object.keys(FLAT_REGISTRY)[0] as string
    const replField = (FLAT_REGISTRY as unknown as Record<string, RegistryField>)[replacementId]
    const dep = { ...replField, deprecated_since: 2, replacedBy: replacementId } as RegistryField
    expect(deprecatedTooltip(dep)).toBe(
      `Устарело с версии 2 · См. вместо: ${fieldLabel(replField)}`
    )

    // replacedBy без записи в реестре — падает на id
    const depUnknown = {
      ...replField,
      deprecated_since: 3,
      replacedBy: 'no_such_field',
    } as RegistryField
    expect(deprecatedTooltip(depUnknown)).toBe('Устарело с версии 3 · См. вместо: no_such_field')

    // не-deprecated — undefined
    expect(deprecatedTooltip({ ...replField } as RegistryField)).toBeUndefined()
  })

  it('isFieldRowHiddenForVersions: скрывает deprecated-поле, если ВСЕ версии >= deprecated_since', () => {
    const dep: RegistryField = { id: 'dep', label: 'Dep', ui: 'select', deprecated_since: 2 }
    const plain: RegistryField = { id: 'x', label: 'X', ui: 'select' }
    // все фазы нового протокола → строка скрывается
    expect(isFieldRowHiddenForVersions(dep, [2, 3, 5])).toBe(true)
    // хотя бы одна фаза старше → строка остаётся (доступ к старым данным)
    expect(isFieldRowHiddenForVersions(dep, [1, 2, 3])).toBe(false)
    // пустой список / нет фаз → не скрываем
    expect(isFieldRowHiddenForVersions(dep, [])).toBe(false)
    // не-deprecated поле не скрывается вовсе
    expect(isFieldRowHiddenForVersions(plain, [2, 3])).toBe(false)
  })
})
