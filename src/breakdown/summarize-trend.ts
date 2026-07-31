import type { Category } from '../domain/category.ts'
import { isDateInPeriod, pad2 } from '../domain/period.ts'
import type { Period } from '../domain/period.ts'
import type { Transaction } from '../domain/transaction.ts'

export interface CategoryTrendRow {
  categoryId: string
  categoryName: string
  amountsByMonth: Record<string, number>
}

export interface TrendSummary {
  months: string[]
  rows: CategoryTrendRow[]
}

function monthsInPeriod(period: Period): string[] {
  const [startYear, startMonth] = period.start.slice(0, 7).split('-').map(Number)
  const endYearMonth = period.end.slice(0, 7)

  const months: string[] = []
  let year = startYear
  let month = startMonth
  let current = `${year}-${pad2(month)}`
  while (current <= endYearMonth) {
    months.push(current)
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
    current = `${year}-${pad2(month)}`
  }
  return months
}

export function summarizeTrend(transactions: Transaction[], categories: Category[], period: Period): TrendSummary {
  const months = monthsInPeriod(period)

  const expenseTransactions = transactions.filter(
    (transaction) => transaction.direction === 'expense' && isDateInPeriod(transaction.date, period),
  )

  const amountsByCategoryId = new Map<string, Map<string, number>>()
  for (const transaction of expenseTransactions) {
    const month = transaction.date.slice(0, 7)
    const amountsByMonth = amountsByCategoryId.get(transaction.categoryId) ?? new Map<string, number>()
    amountsByMonth.set(month, (amountsByMonth.get(month) ?? 0) - transaction.amount)
    amountsByCategoryId.set(transaction.categoryId, amountsByMonth)
  }

  const rows = [...amountsByCategoryId.entries()]
    .map(([categoryId, amountsByMonth]) => ({
      categoryId,
      categoryName: categories.find((category) => category.id === categoryId)?.name ?? categoryId,
      amountsByMonth: Object.fromEntries(months.map((month) => [month, amountsByMonth.get(month) ?? 0])),
    }))
    .sort((a, b) => {
      const totalA = Object.values(a.amountsByMonth).reduce((sum, amount) => sum + amount, 0)
      const totalB = Object.values(b.amountsByMonth).reduce((sum, amount) => sum + amount, 0)
      return totalB - totalA
    })

  return { months, rows }
}
