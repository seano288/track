import { describe, expect, it } from 'vitest'
import type { Category } from '../domain/category.ts'
import { periodForCustom, periodForMonth } from '../domain/period.ts'
import type { Transaction } from '../domain/transaction.ts'
import { UNCATEGORIZED } from '../domain/transaction.ts'
import { summarizeTrend } from './summarize-trend.ts'

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

describe('summarizeTrend', () => {
  it('lists every month in the period, in ascending order', () => {
    const { months } = summarizeTrend([], categories, periodForCustom('2024-01-10', '2024-03-05'))

    expect(months).toEqual(['2024-01', '2024-02', '2024-03'])
  })

  it('sums each category\'s expenses per month as a positive amount', () => {
    const transactions = [
      transaction({ id: 't1', date: '2024-01-05', categoryId: 'category-groceries', amount: -1000 }),
      transaction({ id: 't2', date: '2024-01-20', categoryId: 'category-groceries', amount: -500 }),
      transaction({ id: 't3', date: '2024-02-10', categoryId: 'category-groceries', amount: -700 }),
    ]

    const { rows } = summarizeTrend(transactions, categories, periodForCustom('2024-01-01', '2024-02-29'))

    expect(rows).toEqual([
      { categoryId: 'category-groceries', categoryName: 'Groceries', amountsByMonth: { '2024-01': 1500, '2024-02': 700 } },
    ])
  })

  it('fills a zero for a month a category had no spend, within the period', () => {
    const transactions = [transaction({ id: 't1', date: '2024-01-05', categoryId: 'category-groceries', amount: -1000 })]

    const { rows } = summarizeTrend(transactions, categories, periodForCustom('2024-01-01', '2024-03-31'))

    expect(rows).toEqual([
      {
        categoryId: 'category-groceries',
        categoryName: 'Groceries',
        amountsByMonth: { '2024-01': 1000, '2024-02': 0, '2024-03': 0 },
      },
    ])
  })

  it('omits a category with no spend anywhere in the period', () => {
    const transactions = [transaction({ id: 't1', date: '2024-01-05', categoryId: 'category-groceries', amount: -1000 })]

    const { rows } = summarizeTrend(transactions, categories, periodForMonth('2024-01'))

    expect(rows.map((row) => row.categoryId)).toEqual(['category-groceries'])
  })

  it('excludes Transfers from every month', () => {
    const transactions = [
      transaction({ id: 't1', direction: 'transfer', amount: -50000, categoryId: 'category-rent' }),
      transaction({ id: 't2', direction: 'expense', amount: -1000, categoryId: 'category-groceries' }),
    ]

    const { rows } = summarizeTrend(transactions, categories, periodForMonth('2024-01'))

    expect(rows.map((row) => row.categoryId)).toEqual(['category-groceries'])
  })

  it('nets a refund (a positive-amount expense) within its own category and month', () => {
    const transactions = [
      transaction({ id: 't1', date: '2024-01-05', categoryId: 'category-groceries', amount: -1000 }),
      transaction({ id: 't2', date: '2024-01-20', categoryId: 'category-groceries', amount: 400 }),
    ]

    const { rows } = summarizeTrend(transactions, categories, periodForMonth('2024-01'))

    expect(rows).toEqual([
      { categoryId: 'category-groceries', categoryName: 'Groceries', amountsByMonth: { '2024-01': 600 } },
    ])
  })

  it('excludes transactions outside the period', () => {
    const transactions = [
      transaction({ id: 't1', date: '2023-12-31', categoryId: 'category-groceries', amount: -1000 }),
      transaction({ id: 't2', date: '2024-02-01', categoryId: 'category-groceries', amount: -1000 }),
    ]

    const { rows } = summarizeTrend(transactions, categories, periodForMonth('2024-01'))

    expect(rows).toEqual([])
  })

  it('labels Uncategorized transactions with the sentinel name', () => {
    const transactions = [transaction({ id: 't1', categoryId: UNCATEGORIZED, amount: -1000 })]

    const { rows } = summarizeTrend(transactions, categories, periodForMonth('2024-01'))

    expect(rows).toEqual([
      { categoryId: UNCATEGORIZED, categoryName: UNCATEGORIZED, amountsByMonth: { '2024-01': 1000 } },
    ])
  })

  it('sorts rows by total spend across the period, descending', () => {
    const transactions = [
      transaction({ id: 't1', categoryId: 'category-groceries', amount: -1000 }),
      transaction({ id: 't2', categoryId: 'category-rent', amount: -2000 }),
    ]

    const { rows } = summarizeTrend(transactions, categories, periodForMonth('2024-01'))

    expect(rows.map((row) => row.categoryId)).toEqual(['category-rent', 'category-groceries'])
  })

  it('returns no months and no rows when nothing falls in the period', () => {
    const result = summarizeTrend([], categories, periodForMonth('2024-01'))

    expect(result).toEqual({ months: ['2024-01'], rows: [] })
  })
})
