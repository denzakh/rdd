import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

import {
  BinaryFeaturesSection,
  buildBinaryGroups,
  type BinaryFeatureCountView,
} from '@/features/reports/ui/binary-features-section'

/**
 * Группировка бинарных признаков /reports повторяет матрицу:
 * секции реестра (status / therapy / remission в порядке SECTION_ORDER),
 * фармакотерапия — по подгруппам THERAPY_GROUPS в порядке order
 * (как subheader-строки buildMatrixRows).
 */
const counts = (pairs: Array<[string, number, number]>): BinaryFeatureCountView[] =>
  pairs.map(([fieldId, yes, total]) => ({ fieldId, yes, total }))

const sample = counts([
  ['melancholy_obj', 3, 10], // status
  ['subdepression_const', 2, 8], // remission
  ['beta_blockers', 1, 5], // therapy / depressogenic
  ['ad_tricyclic', 4, 6], // therapy / ad_classes
])

describe('buildBinaryGroups: группировка как в матрице', () => {
  it('секции в порядке матрицы, терапия разбита на подгруппы THERAPY_GROUPS', () => {
    const groups = buildBinaryGroups(sample, 'ru')
    expect(groups.map((g) => g.title)).toEqual([
      'Психический статус',
      'Депрессогенный фон',
      'Антидепрессанты: классы',
      'Ремиссия',
    ])
  })

  it('EN-локаль: заголовки секций и подгрупп локализованы', () => {
    const groups = buildBinaryGroups(sample, 'en')
    expect(groups.map((g) => g.title)).toEqual([
      'Mental status',
      'Depressogenic background',
      'Antidepressant classes',
      'Remission',
    ])
  })

  it('строки групп: да/знаменатель передаются, подписи — из реестра', () => {
    const groups = buildBinaryGroups(sample, 'ru')
    const status = groups[0]
    const melancholy = status.rows.find((r) => r.label === 'Тоска')
    expect(melancholy).toEqual({ label: 'Тоска', yes: 3, total: 10 })
    expect(groups[1].rows[0]).toEqual({ label: 'Бета-блокаторы', yes: 1, total: 5 })
  })

  it('пустые подгруппы пропускаются, неизвестные/не-бинарные id игнорируются', () => {
    const groups = buildBinaryGroups(
      counts([
        ['beta_blockers', 1, 5],
        // Не входят в BINARY_PHASE_COLUMNS: вычисляемые и patient-scope.
        ['pure_remission', 7, 7],
        ['family_history', 1, 4],
        ['no_such_field', 1, 1],
      ]),
      'ru'
    )
    // Только депрессогенный фон; somatic/ad_classes/ad_course/nl_trank пусты.
    expect(groups.map((g) => g.title)).toEqual(['Депрессогенный фон'])
    expect(groups[0].rows).toHaveLength(1)
  })
})

describe('BinaryFeaturesSection: рендер таблиц /reports', () => {
  it('рендер: заголовки групп + строки признаков с процентами', () => {
    const html = renderToStaticMarkup(BinaryFeaturesSection({ counts: sample, locale: 'ru' }))
    expect(html).toContain('Бинарные признаки фаз')
    expect(html).toContain('Психический статус')
    expect(html).toContain('Депрессогенный фон')
    expect(html).toContain('Тоска')
    expect(html).toContain('30%')
    expect(html).toContain('66.7%')
    expect(html).toContain('служебные фазы 98/99 исключены')
  })

  it('пустой список счётчиков — секция не рендерится', () => {
    const html = renderToStaticMarkup(BinaryFeaturesSection({ counts: [], locale: 'en' }))
    expect(html).toBe('')
  })
})
