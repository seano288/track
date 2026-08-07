import { describe, expect, it } from 'vitest'
import {
  defaultPeriod,
  periodForCustom,
  periodForLastMonth,
  periodForMonth,
  periodForQuarter,
  periodForThisMonth,
  periodForYear,
  periodForYearToDate,
  periodsEqual,
} from './period.ts'

describe('periodForMonth', () => {
  it('spans the first to last day of the given month', () => {
    expect(periodForMonth('2024-02')).toEqual({ type: 'month', start: '2024-02-01', end: '2024-02-29' })
  })

  it('handles a 31-day month', () => {
    expect(periodForMonth('2024-01')).toEqual({ type: 'month', start: '2024-01-01', end: '2024-01-31' })
  })
})

describe('periodForQuarter', () => {
  it('spans the three months of the given quarter', () => {
    expect(periodForQuarter(2024, 1)).toEqual({ type: 'quarter', start: '2024-01-01', end: '2024-03-31' })
  })

  it('spans the last quarter of the year', () => {
    expect(periodForQuarter(2024, 4)).toEqual({ type: 'quarter', start: '2024-10-01', end: '2024-12-31' })
  })
})

describe('periodForYear', () => {
  it('spans the full calendar year', () => {
    expect(periodForYear(2024)).toEqual({ type: 'year', start: '2024-01-01', end: '2024-12-31' })
  })
})

describe('periodForCustom', () => {
  it('uses the given start and end dates as-is', () => {
    expect(periodForCustom('2024-03-05', '2024-04-10')).toEqual({
      type: 'custom',
      start: '2024-03-05',
      end: '2024-04-10',
    })
  })
})

describe('defaultPeriod', () => {
  it('is the calendar month containing the given reference date', () => {
    expect(defaultPeriod(new Date(2024, 5, 15))).toEqual({ type: 'month', start: '2024-06-01', end: '2024-06-30' })
  })
})

describe('periodForThisMonth', () => {
  it('is the calendar month containing the given reference date', () => {
    expect(periodForThisMonth(new Date(2024, 5, 15))).toEqual({ type: 'month', start: '2024-06-01', end: '2024-06-30' })
  })
})

describe('periodForLastMonth', () => {
  it('is the calendar month before the given reference date', () => {
    expect(periodForLastMonth(new Date(2024, 5, 15))).toEqual({ type: 'month', start: '2024-05-01', end: '2024-05-31' })
  })

  it('rolls back across a year boundary in January', () => {
    expect(periodForLastMonth(new Date(2024, 0, 15))).toEqual({ type: 'month', start: '2023-12-01', end: '2023-12-31' })
  })
})

describe('periodForYearToDate', () => {
  it('spans January 1 of the current year through the reference date, inclusive', () => {
    expect(periodForYearToDate(new Date(2024, 5, 15))).toEqual({
      type: 'year-to-date',
      start: '2024-01-01',
      end: '2024-06-15',
    })
  })

  it('is a single day when the reference date is January 1', () => {
    expect(periodForYearToDate(new Date(2024, 0, 1))).toEqual({
      type: 'year-to-date',
      start: '2024-01-01',
      end: '2024-01-01',
    })
  })
})

describe('periodsEqual', () => {
  it('is true when type, start, and end all match', () => {
    expect(periodsEqual(periodForYear(2024), periodForYear(2024))).toBe(true)
  })

  it('is false when the type differs but the dates coincide', () => {
    expect(periodsEqual(periodForYear(2024), periodForCustom('2024-01-01', '2024-12-31'))).toBe(false)
  })

  it('is false when a date differs', () => {
    expect(periodsEqual(periodForYear(2024), periodForYear(2025))).toBe(false)
  })
})
