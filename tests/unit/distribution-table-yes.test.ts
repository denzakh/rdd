import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

import { DistributionTableYes, yesFeatureRow } from '@/features/reports/ui/distribution-table-yes'

/** Хелпер сборки строки признака из распределения 0/1. */
describe('yesFeatureRow: сборка строки «да/нет»-признака', () => {
  it('«да» — строка со значением 1, знаменатель — все записи', () => {
    expect(
      yesFeatureRow(
        [
          { value: 0, count: 1 },
          { value: 1, count: 2 },
        ],
        'Наследственная отягощённость психическими заболеваниями'
      )
    ).toEqual({
      label: 'Наследственная отягощённость психическими заболеваниями',
      yes: 2,
      total: 3,
    })
  })

  it('отсутствие строки 1 даёт yes = 0 при ненулевом знаменателе', () => {
    expect(yesFeatureRow([{ value: 0, count: 4 }], 'Признак')).toEqual({
      label: 'Признак',
      yes: 0,
      total: 4,
    })
  })

  it('пустое распределение даёт нули', () => {
    expect(yesFeatureRow([], 'Признак')).toEqual({ label: 'Признак', yes: 0, total: 0 })
  })
})

/** Рендер таблицы /reports (серверный, без JS). */
describe('DistributionTableYes: рендер таблицы «да/нет»-признаков', () => {
  it('рендер: строка признака — название, % да и абс. число да', () => {
    const html = renderToStaticMarkup(
      DistributionTableYes({
        rows: [
          {
            label: 'Наследственная отягощённость психическими заболеваниями',
            yes: 2,
            total: 3,
          },
        ],
        locale: 'ru',
        unit: 'patients',
      })
    )

    expect(html).toContain('<table')
    expect(html).toContain('Наследственная отягощённость психическими заболеваниями')
    expect(html).toContain('% да')
    expect(html).toContain('Абс. число да (пациентов)')
    expect(html).toContain('66.7%')
    expect(html).toContain('>2<')
  })

  it('рендер: английская локаль и единица «фазы»', () => {
    const html = renderToStaticMarkup(
      DistributionTableYes({
        rows: [{ label: 'Hereditary mental burden', yes: 1, total: 4 }],
        locale: 'en',
        unit: 'phases',
      })
    )

    expect(html).toContain('Feature')
    expect(html).toContain('Yes, %')
    expect(html).toContain('Yes, abs (phases)')
    expect(html).toContain('25%')
  })

  it('рендер: без заполненных записей — заглушка, без таблицы', () => {
    const html = renderToStaticMarkup(
      DistributionTableYes({
        rows: [{ label: 'Признак', yes: 0, total: 0 }],
        locale: 'ru',
      })
    )

    expect(html).toContain('Нет данных')
    expect(html).not.toContain('<table')
  })

  it('рендер: пустой список строк — английская заглушка', () => {
    const html = renderToStaticMarkup(DistributionTableYes({ rows: [], locale: 'en' }))

    expect(html).toContain('No data')
    expect(html).not.toContain('<table')
  })
})
