import { describe, expect, it } from 'vitest'
import type { Account } from '../domain/account.ts'
import type { Category } from '../domain/category.ts'
import type { Transaction } from '../domain/transaction.ts'
import { UNCATEGORIZED } from '../domain/transaction.ts'
import { filterSortTransactions } from './filter-sort-transactions.ts'

const accounts: Account[] = [
  { id: 'account-checking', name: 'Checking' },
  { id: 'account-credit', name: 'Credit Card' },
]

const categories: Category[] = [
  { id: 'category-groceries', name: 'Groceries' },
  { id: 'category-rent', name: 'Rent' },
]

function transaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'transaction-1',
    accountId: 'account-checking',
    date: '2024-01-15',
    amount: -1000,
    description: 'Whole Foods',
    direction: 'expense',
    categoryId: 'category-groceries',
    ...overrides,
  }
}

describe('filterSortTransactions', () => {
  it('returns all transactions sorted by date descending when no filters given', () => {
    const older = transaction({ id: 't1', date: '2024-01-01' })
    const newer = transaction({ id: 't2', date: '2024-02-01' })

    const result = filterSortTransactions([older, newer], accounts, categories, {})

    expect(result.map((t) => t.id)).toEqual(['t2', 't1'])
  })

  it('searches by description, case-insensitive', () => {
    const match = transaction({ id: 't1', description: 'Whole Foods Market' })
    const noMatch = transaction({ id: 't2', description: 'Shell Gas' })

    const result = filterSortTransactions([match, noMatch], accounts, categories, { search: 'whole' })

    expect(result.map((t) => t.id)).toEqual(['t1'])
  })

  it('searches by note', () => {
    const match = transaction({ id: 't1', description: 'ACME CORP 4821', note: 'Birthday gift' })
    const noMatch = transaction({ id: 't2', description: 'Other charge' })

    const result = filterSortTransactions([match, noMatch], accounts, categories, { search: 'birthday' })

    expect(result.map((t) => t.id)).toEqual(['t1'])
  })

  it('filters by account', () => {
    const checking = transaction({ id: 't1', accountId: 'account-checking' })
    const credit = transaction({ id: 't2', accountId: 'account-credit' })

    const result = filterSortTransactions([checking, credit], accounts, categories, { accountId: 'account-credit' })

    expect(result.map((t) => t.id)).toEqual(['t2'])
  })

  it('filters by category', () => {
    const groceries = transaction({ id: 't1', categoryId: 'category-groceries' })
    const rent = transaction({ id: 't2', categoryId: 'category-rent' })

    const result = filterSortTransactions([groceries, rent], accounts, categories, { categoryId: 'category-rent' })

    expect(result.map((t) => t.id)).toEqual(['t2'])
  })

  it('filters by direction', () => {
    const expense = transaction({ id: 't1', direction: 'expense' })
    const income = transaction({ id: 't2', direction: 'income' })

    const result = filterSortTransactions([expense, income], accounts, categories, { direction: 'income' })

    expect(result.map((t) => t.id)).toEqual(['t2'])
  })

  it('filters by inclusive date range', () => {
    const before = transaction({ id: 't1', date: '2024-01-01' })
    const inRange = transaction({ id: 't2', date: '2024-01-15' })
    const after = transaction({ id: 't3', date: '2024-02-01' })

    const result = filterSortTransactions([before, inRange, after], accounts, categories, {
      dateStart: '2024-01-10',
      dateEnd: '2024-01-31',
    })

    expect(result.map((t) => t.id)).toEqual(['t2'])
  })

  it('filters by inclusive amount range, matching magnitude regardless of expense/income sign', () => {
    const tooSmall = transaction({ id: 't1', amount: -500 })
    const expenseInRange = transaction({ id: 't2', amount: -1000, direction: 'expense' })
    const incomeInRange = transaction({ id: 't3', amount: 1500, direction: 'income' })
    const tooLarge = transaction({ id: 't4', amount: -5000 })

    const result = filterSortTransactions([tooSmall, expenseInRange, incomeInRange, tooLarge], accounts, categories, {
      amountMin: 1000,
      amountMax: 2000,
    })

    expect(result.map((t) => t.id)).toEqual(['t2', 't3'])
  })

  it('filters to uncategorized only', () => {
    const categorized = transaction({ id: 't1', categoryId: 'category-groceries' })
    const uncategorized = transaction({ id: 't2', categoryId: UNCATEGORIZED })

    const result = filterSortTransactions([categorized, uncategorized], accounts, categories, {
      uncategorizedOnly: true,
    })

    expect(result.map((t) => t.id)).toEqual(['t2'])
  })

  it('combines filters as AND', () => {
    const wantedAccountWrongCategory = transaction({
      id: 't1',
      accountId: 'account-checking',
      categoryId: 'category-rent',
    })
    const wantedBoth = transaction({ id: 't2', accountId: 'account-checking', categoryId: 'category-groceries' })
    const wrongAccountWantedCategory = transaction({
      id: 't3',
      accountId: 'account-credit',
      categoryId: 'category-groceries',
    })

    const result = filterSortTransactions(
      [wantedAccountWrongCategory, wantedBoth, wrongAccountWantedCategory],
      accounts,
      categories,
      { accountId: 'account-checking', categoryId: 'category-groceries' },
    )

    expect(result.map((t) => t.id)).toEqual(['t2'])
  })

  it('combines search, date range, amount range, and uncategorized-only together', () => {
    const wanted = transaction({
      id: 't1',
      description: 'Whole Foods Market',
      date: '2024-01-15',
      amount: -1000,
      categoryId: UNCATEGORIZED,
    })
    const wrongSearch = transaction({ id: 't2', description: 'Shell Gas', date: '2024-01-15', amount: -1000, categoryId: UNCATEGORIZED })
    const wrongDate = transaction({ id: 't3', description: 'Whole Foods Market', date: '2024-03-01', amount: -1000, categoryId: UNCATEGORIZED })
    const wrongAmount = transaction({ id: 't4', description: 'Whole Foods Market', date: '2024-01-15', amount: -9000, categoryId: UNCATEGORIZED })
    const wrongCategory = transaction({
      id: 't5',
      description: 'Whole Foods Market',
      date: '2024-01-15',
      amount: -1000,
      categoryId: 'category-groceries',
    })

    const result = filterSortTransactions(
      [wanted, wrongSearch, wrongDate, wrongAmount, wrongCategory],
      accounts,
      categories,
      {
        search: 'whole',
        dateStart: '2024-01-01',
        dateEnd: '2024-01-31',
        amountMin: 500,
        amountMax: 1500,
        uncategorizedOnly: true,
      },
    )

    expect(result.map((t) => t.id)).toEqual(['t1'])
  })

  it('sorts by amount ascending', () => {
    const high = transaction({ id: 't1', amount: 500 })
    const low = transaction({ id: 't2', amount: -5000 })

    const result = filterSortTransactions([high, low], accounts, categories, {
      sortColumn: 'amount',
      sortDirection: 'asc',
    })

    expect(result.map((t) => t.id)).toEqual(['t2', 't1'])
  })

  it('sorts by description descending', () => {
    const alpha = transaction({ id: 't1', description: 'Alpha' })
    const zeta = transaction({ id: 't2', description: 'Zeta' })

    const result = filterSortTransactions([alpha, zeta], accounts, categories, {
      sortColumn: 'description',
      sortDirection: 'desc',
    })

    expect(result.map((t) => t.id)).toEqual(['t2', 't1'])
  })

  it('sorts by account name rather than account id', () => {
    const credit = transaction({ id: 't1', accountId: 'account-credit' })
    const checking = transaction({ id: 't2', accountId: 'account-checking' })

    const result = filterSortTransactions([credit, checking], accounts, categories, {
      sortColumn: 'account',
      sortDirection: 'asc',
    })

    expect(result.map((t) => t.id)).toEqual(['t2', 't1'])
  })

  it('sorts by category name rather than category id', () => {
    const rent = transaction({ id: 't1', categoryId: 'category-rent' })
    const groceries = transaction({ id: 't2', categoryId: 'category-groceries' })

    const result = filterSortTransactions([rent, groceries], accounts, categories, {
      sortColumn: 'category',
      sortDirection: 'asc',
    })

    expect(result.map((t) => t.id)).toEqual(['t2', 't1'])
  })
})
