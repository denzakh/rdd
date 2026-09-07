import { describe, expect, it } from 'vitest'
import { diffMonths, diffYears, getAgeGroup } from '@/shared/lib/intl/calculations'

describe('calculations: diffYears (возраст)', () => {
  it('полные годы без учёта дня рождения', () => {
    expect(diffYears('1980-06-15', '2024-06-14')).toBe(43)
    expect(diffYears('1980-06-15', '2024-06-15')).toBe(44)
    expect(diffYears('1980-06-15', '2024-06-16')).toBe(44)
  })

  it('разница меньше года → 0', () => {
    expect(diffYears('2024-01-01', '2024-12-31')).toBe(0)
  })

  it('некорректные даты → 0', () => {
    expect(diffYears('not-a-date', '2024-01-01')).toBe(0)
    expect(diffYears('2024-01-01', 'not-a-date')).toBe(0)
  })

  it('принимает Date и number (timestamp)', () => {
    const start = new Date('1990-01-01T00:00:00Z')
    expect(diffYears(start, new Date('2020-01-02T00:00:00Z'))).toBe(30)
    expect(diffYears(start.getTime(), Date.UTC(2020, 0, 2))).toBe(30)
  })
})

describe('calculations: diffMonths (длительность фаз)', () => {
  it('полные месяцы', () => {
    expect(diffMonths('2024-01-10', '2024-07-10')).toBe(6)
    expect(diffMonths('2024-01-10', '2024-07-09')).toBe(5)
  })

  it('переход через год', () => {
    expect(diffMonths('2023-05-01', '2024-05-01')).toBe(12)
  })

  it('меньше месяца → 0, некорректные даты → 0', () => {
    expect(diffMonths('2024-01-01', '2024-01-31')).toBe(0)
    expect(diffMonths('bad', '2024-01-01')).toBe(0)
  })
})

describe('calculations: getAgeGroup', () => {
  it('группы 1..5 по возрасту', () => {
    expect(getAgeGroup(0)).toBe(1)
    expect(getAgeGroup(49)).toBe(1)
    expect(getAgeGroup(50)).toBe(2)
    expect(getAgeGroup(59)).toBe(2)
    expect(getAgeGroup(60)).toBe(3)
    expect(getAgeGroup(69)).toBe(3)
    expect(getAgeGroup(70)).toBe(4)
    expect(getAgeGroup(79)).toBe(4)
    expect(getAgeGroup(80)).toBe(5)
    expect(getAgeGroup(120)).toBe(5)
  })
})
