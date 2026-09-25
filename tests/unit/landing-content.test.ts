import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

import { dictFor } from '@/shared/lib/intl/dictionaries'
import { Landing } from '@/widgets/landing'
import { buildCards, buildGoals, buildHighlights } from '@/widgets/landing/model/landing-content'

/**
 * Витрина `/` (docs/ru/spec-public-1.md §3) после выноса контента в
 * `model/landing-content`: сборка view-модели из словаря и целостность
 * разметки слайса `widgets/landing`. Рендер — `renderToStaticMarkup`,
 * без БД и сессии: у витрины единственный вход, словарь локали.
 */

const ru = dictFor('ru').landing
const en = dictFor('en').landing

describe('landing-content: view-модель витрины', () => {
  it('buildCards: 4 карточки в порядке спеки, глифы — из public/images', () => {
    const cards = buildCards(ru)

    expect(cards.map((c) => c.icon)).toEqual([
      '/images/patient.svg',
      '/images/matrix.svg',
      '/images/report.svg',
      '/images/journal.svg',
    ])
    expect(cards.map((c) => c.title)).toEqual([
      ru.cardPassportTitle,
      ru.cardMatrixTitle,
      ru.cardReportsTitle,
      ru.cardDictionaryTitle,
    ])
    expect(cards.every((c) => c.text.length > 0)).toBe(true)
  })

  it('buildHighlights: 3 инженерных блока, тексты не дублируются в ui', () => {
    const highlights = buildHighlights(ru)

    expect(highlights).toEqual([
      {
        title: ru.highlightRegistryTitle,
        text1: ru.highlightRegistryText1,
        text2: ru.highlightRegistryText2,
      },
      {
        title: ru.highlightMatrixTitle,
        text1: ru.highlightMatrixText1,
        text2: ru.highlightMatrixText2,
      },
      {
        title: ru.highlightEdgeTitle,
        text1: ru.highlightEdgeText1,
        text2: ru.highlightEdgeText2,
      },
    ])
  })

  it('buildGoals: две аудитории, списки берутся из словаря как есть', () => {
    const { doctors, tech } = buildGoals(ru)

    expect(doctors).toEqual({ title: ru.forDoctors.title, list: ru.forDoctors.list })
    expect(tech).toEqual({ title: ru.forTech.title, list: ru.forTech.list })
    expect(doctors.list.length).toBeGreaterThan(0)
    expect(tech.list.length).toBeGreaterThan(0)
  })

  it('сборка идёт от переданного словаря, а не от ru по умолчанию', () => {
    expect(buildCards(en)[0].title).not.toBe(buildCards(ru)[0].title)
    expect(buildGoals(en).doctors.list).not.toEqual(buildGoals(ru).doctors.list)
  })
})

describe('Landing: композиция секций витрины', () => {
  const htmlRu = renderToStaticMarkup(Landing({ dict: ru }))

  it('5 секций + футер, ни одна не потеряна и не продублирована', () => {
    expect(htmlRu.match(/<section/g) ?? []).toHaveLength(5)
    expect(htmlRu.match(/<footer/g) ?? []).toHaveLength(1)
  })

  it('все тексты блоков приходят из словаря', () => {
    expect(htmlRu).toContain(ru.title)
    expect(htmlRu).toContain(ru.badge)
    expect(htmlRu).toContain(ru.targetAudienceTitle)
    expect(htmlRu).toContain(ru.capabilitiesTitle)
    expect(htmlRu).toContain(ru.techHighlightsTitle)
    expect(htmlRu).toContain(ru.boundariesTitle)
    expect(htmlRu).toContain(ru.footerNote)

    for (const card of buildCards(ru)) {
      expect(htmlRu).toContain(card.title)
    }
    for (const goal of Object.values(buildGoals(ru))) {
      for (const item of goal.list) {
        expect(htmlRu).toContain(item)
      }
    }
  })

  it('глифы карточек рисуются CSS-маской по URL из public/images', () => {
    for (const card of buildCards(ru)) {
      expect(htmlRu).toContain(`mask-image:url(${card.icon})`)
    }
    expect(htmlRu).toContain('aspect-ratio:2816 / 1536')
  })

  it('en-словарь даёт английскую витрину без остатков ru', () => {
    const htmlEn = renderToStaticMarkup(Landing({ dict: en }))

    expect(htmlEn).toContain(en.title)
    expect(htmlEn).not.toContain(ru.title)
    expect(htmlEn).toContain(en.footerNote)
  })

  it('нет утечек undefined и [object Object] в разметку', () => {
    expect(htmlRu).not.toContain('undefined')
    expect(htmlRu).not.toContain('[object Object]')
  })
})
