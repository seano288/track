import { describe, expect, it } from 'vitest'
import type { Category } from '../domain/category.ts'
import { periodForMonth, periodForRange } from '../domain/period.ts'
import type { Transaction } from '../domain/transaction.ts'
import { UNCATEGORIZED } from '../domain/transaction.ts'
import { summarizePeriod } from './summarize-period.ts'

function transaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'transaction-1',
    accountId: 'account-checking',
    date: '2024-01-15',
    amount: -1000,
    description: 'Coffee shop',
    direction: 'expense',
    categoryId: 'category-groceries',
    ...overrides,
  }
}

const categories: Category[] = [
  { id: 'category-groceries', name: 'Groceries' },
  { id: 'category-rent', name: 'Rent' },
]

describe('summarizePeriod', () => {
  it('sums each category\'s expenses within the period as a positive amount', () => {
    const transactions = [
      transaction({ id: 't1', categoryId: 'category-groceries', amount: -1000 }),
      transaction({ id: 't2', categoryId: 'category-groceries', amount: -500 }),
      transaction({ id: 't3', categoryId: 'category-rent', amount: -2000 }),
    ]

    const { breakdown } = summarizePeriod(transactions, categories, periodForMonth('2024-01'))

    expect(breakdown).toEqual(
      expect.arrayContaining([
        { categoryId: 'category-groceries', categoryName: 'Groceries', amount: 1500, percentage: (1500 / 3500) * 100 },
        { categoryId: 'category-rent', categoryName: 'Rent', amount: 2000, percentage: (2000 / 3500) * 100 },
      ]),
    )
  })

  it('excludes transactions outside the period', () => {
    const transactions = [
      transaction({ id: 't1', date: '2024-01-15', amount: -1000 }),
      transaction({ id: 't2', date: '2024-02-01', amount: -5000 }),
    ]

    const { breakdown } = summarizePeriod(transactions, categories, periodForMonth('2024-01'))

    expect(breakdown).toEqual([{ categoryId: 'category-groceries', categoryName: 'Groceries', amount: 1000, percentage: 100 }])
  })

  it('excludes Transfers from the breakdown entirely', () => {
    const transactions = [
      transaction({ id: 't1', direction: 'transfer', amount: -50000, categoryId: 'category-rent' }),
      transaction({ id: 't2', direction: 'expense', amount: -1000, categoryId: 'category-groceries' }),
    ]

    const { breakdown } = summarizePeriod(transactions, categories, periodForMonth('2024-01'))

    expect(breakdown).toEqual([{ categoryId: 'category-groceries', categoryName: 'Groceries', amount: 1000, percentage: 100 }])
  })

  it('nets a refund (a positive-amount expense) within its own category', () => {
    const transactions = [
      transaction({ id: 't1', categoryId: 'category-groceries', amount: -1000 }),
      transaction({ id: 't2', categoryId: 'category-groceries', amount: 400 }),
    ]

    const { breakdown } = summarizePeriod(transactions, categories, periodForMonth('2024-01'))

    expect(breakdown).toEqual([{ categoryId: 'category-groceries', categoryName: 'Groceries', amount: 600, percentage: 100 }])
  })

  it('labels Uncategorized transactions with the sentinel name', () => {
    const transactions = [transaction({ id: 't1', categoryId: UNCATEGORIZED, amount: -1000 })]

    const { breakdown } = summarizePeriod(transactions, categories, periodForMonth('2024-01'))

    expect(breakdown).toEqual([{ categoryId: UNCATEGORIZED, categoryName: UNCATEGORIZED, amount: 1000, percentage: 100 }])
  })

  it('bases percentage on total positive spend, not net spend, when a credit-only category offsets a real one', () => {
    const transactions = [
      // Real spend in Groceries
      transaction({ id: 't1', categoryId: 'category-groceries', amount: -1000 }),
      // A refund in Rent with no matching same-period purchase — a net credit
      transaction({ id: 't2', categoryId: 'category-rent', amount: 1000 }),
    ]

    const { breakdown } = summarizePeriod(transactions, categories, periodForMonth('2024-01'))

    expect(breakdown).toEqual(
      expect.arrayContaining([
        { categoryId: 'category-groceries', categoryName: 'Groceries', amount: 1000, percentage: 100 },
        { categoryId: 'category-rent', categoryName: 'Rent', amount: -1000, percentage: -100 },
      ]),
    )
  })

  it('returns an empty breakdown and zeroed cash flow when nothing falls in the period', () => {
    const result = summarizePeriod([], categories, periodForMonth('2024-01'))

    expect(result).toEqual({ breakdown: [], cashFlow: { income: 0, expenses: 0, net: 0 } })
  })

  it('computes a cash-flow summary of income, expenses, and net for the period', () => {
    const transactions = [
      transaction({ id: 't1', direction: 'income', categoryId: 'category-salary', amount: 300000 }),
      transaction({ id: 't2', direction: 'expense', categoryId: 'category-rent', amount: -120000 }),
      transaction({ id: 't3', direction: 'expense', categoryId: 'category-groceries', amount: -20000 }),
      transaction({ id: 't4', direction: 'transfer', categoryId: 'category-rent', amount: -50000 }),
    ]

    const { cashFlow } = summarizePeriod(transactions, categories, periodForMonth('2024-01'))

    expect(cashFlow).toEqual({ income: 300000, expenses: 140000, net: 160000 })
  })

  it('respects a custom date range inclusive of both endpoints', () => {
    const transactions = [
      transaction({ id: 't1', date: '2024-01-10', amount: -1000 }),
      transaction({ id: 't2', date: '2024-01-20', amount: -2000 }),
      transaction({ id: 't3', date: '2024-01-21', amount: -4000 }),
    ]

    const { cashFlow } = summarizePeriod(transactions, categories, periodForRange('2024-01-10', '2024-01-20'))

    expect(cashFlow.expenses).toBe(3000)
  })
})
