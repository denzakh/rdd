import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

import { buildSlices, DistributionPie } from '@/features/reports/ui/distribution-pie'
import type { DistributionRow } from '@/features/reports/ui/distribution-table'
import { GENDER_COLORS, SEASON_COLORS } from '@/features/reports/ui/colors'

/** Начало/конец дуги из path: «M 100 100 L x1 y1 A … x2 y2 Z». */
function endpoints(path: string): { start: [number, number]; end: [number, number] } {
  const match = path.match(
    /^M 100 100 L ([\d.-]+) ([\d.-]+) A 96 96 0 [01] 1 ([\d.-]+) ([\d.-]+) Z$/
  )
  if (!match) throw new Error(`unexpected path: ${path}`)
  return {
    start: [Number(match[1]), Number(match[2])],
    end: [Number(match[3]), Number(match[4])],
  }
}

/** Сравнение координат с допуском на погрешность cos/sin. */
function expectPoint([x, y]: [number, number], [ex, ey]: [number, number]) {
  expect(x).toBeCloseTo(ex, 6)
  expect(y).toBeCloseTo(ey, 6)
}

/** Геометрия секторной диаграммы /reports (чистая функция, без рендера). */
describe('buildSlices: секторная диаграмма /reports', () => {
  it('доли суммируются в 100% и считаются от переданной суммы', () => {
    const slices = buildSlices(
      [
        { value: 1, label: 'Лёгкая', count: 1 },
        { value: 2, label: 'Умеренная', count: 2 },
        { value: 3, label: 'Тяжёлая', count: 1 },
      ],
      4
    )

    expect(slices.map((s) => s.pct)).toEqual([25, 50, 25])
    expect(slices.reduce((s, r) => s + r.pct, 0)).toBe(100)
  })

  it('первый сектор начинается сверху (12 часов), следующий продолжает дугу без разрывов', () => {
    const slices = buildSlices(
      [
        { value: 1, label: 'Мужской', count: 1 },
        { value: 2, label: 'Женский', count: 1 },
      ],
      2
    )

    // Верх круга: cx=100, cy=100, r=96 → (100, 4); низ → (100, 196).
    const first = endpoints(slices[0].path)
    expectPoint(first.start, [100, 4])
    expectPoint(first.end, [100, 196])

    // Второй сектор начинается там же, где закончился первый, и замыкается наверх.
    const second = endpoints(slices[1].path)
    expectPoint(second.start, first.end)
    expectPoint(second.end, [100, 4])
  })

  it('сектор больше половины круга получает large-arc-flag=1', () => {
    const slices = buildSlices(
      [
        { value: 1, label: 'Большинство', count: 3 },
        { value: 2, label: 'Меньшинство', count: 1 },
      ],
      4
    )

    expect(slices[0].path).toContain('A 96 96 0 1 1')
    expect(slices[1].path).toContain('A 96 96 0 0 1')
  })

  it('неизвестное значение получает цвет по умолчанию', () => {
    const [slice] = buildSlices([{ value: 99, label: 'Прочее', count: 1 }], 1)

    expect(slice.color).toBe('#737373')
  })

  it('палитра может быть переопределена (диаграмма пола)', () => {
    const colors = { 1: '#2563eb' }
    const [slice] = buildSlices([{ value: 1, label: 'Мужской', count: 1 }], 1, colors)

    expect(slice.color).toBe('#2563eb')
  })

  it('каждому значению соответствует свой hex-цвет', () => {
    const slices = buildSlices(
      [
        { value: 1, label: 'Лёгкая', count: 1 },
        { value: 2, label: 'Умеренная', count: 1 },
        { value: 3, label: 'Тяжёлая', count: 1 },
      ],
      3
    )
    expect(slices.map((s) => s.color)).toEqual(['#16a34a', '#fbbf24', '#dc2626'])
  })

  it('рендер: сектора получают цветной fill, а не чёрный по умолчанию', () => {
    const rows: DistributionRow[] = [
      { value: 1, label: 'Лёгкая', count: 1 },
      { value: 2, label: 'Умеренная', count: 2 },
      { value: 3, label: 'Тяжёлая', count: 1 },
    ]

    const html = renderToStaticMarkup(
      DistributionPie({ rows, locale: 'ru', title: 'Тяжесть депрессии', unit: 'phases' })
    )

    expect(html).toContain('fill="#16a34a"')
    expect(html).toContain('fill="#fbbf24"')
    expect(html).toContain('fill="#dc2626"')
    expect(html).not.toContain('fill="black"')
    expect(html).toContain('Тяжёлая: 1 (25%)')
  })

  it('рендер: единственное значение рисуется кругом на 100%', () => {
    const html = renderToStaticMarkup(
      DistributionPie({
        rows: [{ value: 1, label: 'Мужской', count: 5 }],
        locale: 'en',
        title: 'Gender ratio',
        unit: 'patients',
      })
    )

    expect(html).toContain('<circle')
    expect(html).toContain('fill="#16a34a"')
    expect(html).toContain('Мужской: 5 (100%)')
  })

  it('рендер: без данных выводится заглушка', () => {
    const html = renderToStaticMarkup(
      DistributionPie({ rows: [], locale: 'ru', title: 'Соотношение полов', unit: 'patients' })
    )

    expect(html).toContain('Нет данных')
    expect(html).not.toContain('<svg')
  })

  it('рендер: диаграмма сезонности — каждому сезону свой цвет', () => {
    const html = renderToStaticMarkup(
      DistributionPie({
        rows: [
          { value: 1, label: 'Зима', count: 4 },
          { value: 2, label: 'Весна', count: 3 },
          { value: 3, label: 'Лето', count: 2 },
          { value: 4, label: 'Осень', count: 1 },
        ],
        locale: 'ru',
        title: 'Сезонная зависимость обострений',
        unit: 'phases',
        colors: SEASON_COLORS,
      })
    )

    for (const color of Object.values(SEASON_COLORS)) {
      expect(html).toContain(`fill="${color}"`)
    }
    expect(html).toContain('Зима: 4 (40%)')
    expect(html).toContain('Осень: 1 (10%)')
  })

  it('палитры пола и сезона не пересекаются по цветам внутри себя', () => {
    const gender = Object.values(GENDER_COLORS)
    const season = Object.values(SEASON_COLORS)

    expect(new Set(gender).size).toBe(gender.length)
    expect(new Set(season).size).toBe(season.length)
  })
})
