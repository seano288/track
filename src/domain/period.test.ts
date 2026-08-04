import { describe, expect, it } from 'vitest'
import { defaultPeriod, periodForCustom, periodForMonth, periodForQuarter, periodForYear } from './period.ts'

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
