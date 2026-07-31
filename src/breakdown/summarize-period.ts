import type { Category } from '../domain/category.ts'
import type { Period } from '../domain/period.ts'
import type { Transaction } from '../domain/transaction.ts'

export interface CategoryBreakdownRow {
  categoryId: string
  categoryName: string
  amount: number
  percentage: number
}

export interface CashFlowTotals {
  income: number
  expenses: number
  net: number
}

export interface PeriodSummary {
  breakdown: CategoryBreakdownRow[]
  cashFlow: CashFlowTotals
}

function inPeriod(transaction: Transaction, period: Period): boolean {
  return transaction.date >= period.start && transaction.date <= period.end
}

export function summarizePeriod(transactions: Transaction[], categories: Category[], period: Period): PeriodSummary {
  const inRange = transactions.filter((transaction) => transaction.direction !== 'transfer' && inPeriod(transaction, period))

  const income = inRange.filter((t) => t.direction === 'income').reduce((sum, t) => sum + t.amount, 0)
  const expenseTransactions = inRange.filter((t) => t.direction === 'expense')
  const expenses = -expenseTransactions.reduce((sum, t) => sum + t.amount, 0) || 0

  const spendByCategoryId = new Map<string, number>()
  for (const transaction of expenseTransactions) {
    spendByCategoryId.set(transaction.categoryId, (spendByCategoryId.get(transaction.categoryId) ?? 0) - transaction.amount)
  }

  // A category that's a net credit (its refunds exceeded its same-period spend)
  // isn't "spend" — excluding it from the denominator keeps a real spending
  // category's percentage meaningful even when credits elsewhere net the
  // period's total expenses toward zero.
  const totalSpend = [...spendByCategoryId.values()].filter((amount) => amount > 0).reduce((sum, amount) => sum + amount, 0)

  const breakdown = [...spendByCategoryId.entries()]
    .map(([categoryId, amount]) => ({
      categoryId,
      categoryName: categories.find((category) => category.id === categoryId)?.name ?? categoryId,
      amount,
      percentage: totalSpend !== 0 ? (amount / totalSpend) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount)

  return { breakdown, cashFlow: { income, expenses, net: income - expenses } }
}
