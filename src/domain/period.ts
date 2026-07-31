export type PeriodType = 'month' | 'quarter' | 'year' | 'custom'

// A date range that scopes the Category breakdown and cash-flow summary.
// start/end are ISO dates (YYYY-MM-DD), both inclusive.
export interface Period {
  type: PeriodType
  start: string
  end: string
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function periodForMonth(yearMonth: string): Period {
  const [year, month] = yearMonth.split('-').map(Number)
  return { type: 'month', start: `${yearMonth}-01`, end: `${yearMonth}-${pad2(lastDayOfMonth(year, month))}` }
}

export function periodForQuarter(year: number, quarter: number): Period {
  const startMonth = (quarter - 1) * 3 + 1
  const endMonth = startMonth + 2
  return {
    type: 'quarter',
    start: `${year}-${pad2(startMonth)}-01`,
    end: `${year}-${pad2(endMonth)}-${pad2(lastDayOfMonth(year, endMonth))}`,
  }
}

export function periodForYear(year: number): Period {
  return { type: 'year', start: `${year}-01-01`, end: `${year}-12-31` }
}

export function periodForRange(start: string, end: string): Period {
  return { type: 'custom', start, end }
}

export function defaultPeriod(referenceDate: Date = new Date()): Period {
  const yearMonth = `${referenceDate.getFullYear()}-${pad2(referenceDate.getMonth() + 1)}`
  return periodForMonth(yearMonth)
}
