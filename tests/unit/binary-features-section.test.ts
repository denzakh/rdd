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

  it('группы без заполненных данных (все total = 0) скрыты', () => {
    const groups = buildBinaryGroups(
      counts([
        ['melancholy_obj', 0, 0], // статус: признак нигде не заполнялся
        ['hypochondria', 2, 6], // статус: есть данные → группа видна
        ['beta_blockers', 0, 0], // терапия/депрессогенный фон: пусто
        ['subdepression_const', 1, 3], // ремиссия: есть данные
      ]),
      'ru'
    )
    expect(groups.map((g) => g.title)).toEqual(['Психический статус', 'Ремиссия'])
    // Внутри видимой группы строки с total = 0 сохраняются (0% — честный ноль).
    // В тесте переданы счётчики только двух полей — столько строк и будет;
    // реальный запрос отдаёт все колонки BINARY_PHASE_COLUMNS.
    expect(groups[0].rows).toHaveLength(2)
  })
})

describe('BinaryFeaturesSection: рендер таблиц /reports', () => {
  it('рендер: заголовки групп + строки признаков с процентами', () => {
    const html = renderToStaticMarkup(BinaryFeaturesSection({ counts: sample, locale: 'ru' }))
    expect(html).toContain('Бинарные признаки фаз')
    // Masonry-раскладка: CSS-колонки, карточки не разрываются между колонками.
    expect(html).toContain('columns-1')
    expect(html).toContain('lg:columns-2')
    expect(html).toContain('break-inside-avoid')
    expect(html).toContain('Психический статус')
    expect(html).toContain('Депрессогенный фон')
    expect(html).toContain('Тоска')
    expect(html).toContain('30%')
    expect(html).toContain('66.7%')
    expect(html).toContain('служебные фазы 98/99 исключены')
  })

  it('нет ни одной группы с данными — заглушка «Нет данных»', () => {
    const html = renderToStaticMarkup(BinaryFeaturesSection({ counts: [], locale: 'en' }))
    expect(html).toContain('Binary phase features')
    expect(html).toContain('No data')
  })
})
