import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

import { StatisticsPanel, type StatsReport } from '@/features/reports/ui/statistics-panel'

/**
 * Заголовок блока «Бинарные признаки фаз» принадлежит панели статистики
 * /reports (StatisticsPanel), а не секции BinaryFeaturesSection: секция
 * отдаёт только карточки групп. Тест держит это разделение (одна h2 на блок)
 * и связку «данные запроса → строки таблиц» на уровне панели.
 */
const report = (binaryFeatures: StatsReport['phases']['binaryFeatures'] = []): StatsReport => ({
  generatedAt: '2026-09-20T12:00:00.000Z',
  patients: {
    total: 3,
    gender: [
      { value: 1, count: 1 },
      { value: 2, count: 2 },
    ],
    averageAgeYears: 40,
    averageAgeStddev: 2,
    averageAgePatients: 3,
    familyHistory: [
      { value: 0, count: 1 },
      { value: 1, count: 2 },
    ],
  },
  phases: {
    onsetAge: { value: 30, stddev: 1, patients: 3 },
    diseaseDurationMonths: { value: 120, stddev: 10, patients: 3 },
    avgPhaseCount: { value: 2, stddev: 1, patients: 3 },
    avgPhaseMonths: 6,
    avgIntermissionMonths: 12,
    stddevPhaseMonths: 1,
    stddevIntermissionMonths: 2,
    phaseRows: 6,
    intermissionRows: 5,
    phaseRatio: { firstAvg: 6, penultimateAvg: 5, ratio: 1.2, patients: 3 },
    intermissionRatio: { firstAvg: 10, penultimateAvg: 12, ratio: 0.8333, patients: 3 },
    seasons: [{ season: 1, count: 2 }],
    severity: [{ value: 2, count: 3 }],
    component: [{ value: 1, count: 3 }],
    binaryFeatures,
  },
})

describe('StatisticsPanel: блок «Бинарные признаки фаз»', () => {
  it('заголовок блока — один на странице, над карточками групп секции', () => {
    const html = renderToStaticMarkup(
      StatisticsPanel({
        data: report([{ fieldId: 'melancholy_obj', yes: 3, total: 10 }]),
        locale: 'ru',
      })
    )

    // Ровно одна h2 блока: заголовок не дублируется самой секцией.
    expect(html.match(/Бинарные признаки фаз/g)).toHaveLength(1)
    expect(html).toContain('<h2 class="text-sm font-semibold">Бинарные признаки фаз</h2>')
    // Карточка группы секции идёт следом за заголовком (один родительский <section>).
    expect(html).toMatch(/Бинарные признаки фаз<\/h2>.+Психический статус/s)
    expect(html).toContain('Тоска')
    expect(html).toContain('30%')
  })

  it('EN-локаль: локализованный заголовок; без данных внутри — «No data»', () => {
    const html = renderToStaticMarkup(StatisticsPanel({ data: report(), locale: 'en' }))

    expect(html.match(/Binary phase features/g)).toHaveLength(1)
    expect(html).toContain('<h2 class="text-sm font-semibold">Binary phase features</h2>')
    expect(html).toContain('No data')
  })
})
