import type { Account } from '../domain/account.ts'
import type { Category } from '../domain/category.ts'
import { categoryName } from '../domain/category.ts'
import type { Direction, Transaction } from '../domain/transaction.ts'
import { UNCATEGORIZED } from '../domain/transaction.ts'

export type TransactionSortColumn = 'date' | 'description' | 'category' | 'account' | 'amount'
export type SortDirection = 'asc' | 'desc'

export interface TransactionListFilters {
  search?: string
  accountId?: string
  categoryId?: string
  direction?: Direction
  dateStart?: string
  dateEnd?: string
  // Compared against the transaction's magnitude, not its signed amount — expenses
  // are stored as negative, so a signed comparison would make "$10 to $50" match
  // nothing for a user looking to find expenses in that range.
  amountMin?: number
  amountMax?: number
  uncategorizedOnly?: boolean
  sortColumn?: TransactionSortColumn
  sortDirection?: SortDirection
}

export function filterSortTransactions(
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[],
  filters: TransactionListFilters = {},
): Transaction[] {
  const accountName = (id: string) => accounts.find((account) => account.id === id)?.name ?? id

  const search = filters.search?.trim().toLowerCase()

  const filtered = transactions.filter((transaction) => {
    if (search && !`${transaction.description} ${transaction.note ?? ''}`.toLowerCase().includes(search)) return false
    if (filters.accountId && transaction.accountId !== filters.accountId) return false
    if (filters.categoryId && transaction.categoryId !== filters.categoryId) return false
    if (filters.direction && transaction.direction !== filters.direction) return false
    if (filters.uncategorizedOnly && transaction.categoryId !== UNCATEGORIZED) return false
    if (filters.dateStart && transaction.date < filters.dateStart) return false
    if (filters.dateEnd && transaction.date > filters.dateEnd) return false
    const magnitude = Math.abs(transaction.amount)
    if (filters.amountMin !== undefined && magnitude < filters.amountMin) return false
    if (filters.amountMax !== undefined && magnitude > filters.amountMax) return false
    return true
  })

  const sortColumn = filters.sortColumn ?? 'date'
  const sign = (filters.sortDirection ?? 'desc') === 'asc' ? 1 : -1

  function sortValue(transaction: Transaction): string | number {
    switch (sortColumn) {
      case 'date':
        return transaction.date
      case 'description':
        return transaction.description
      case 'category':
        return categoryName(categories, transaction.categoryId)
      case 'account':
        return accountName(transaction.accountId)
      case 'amount':
        return transaction.amount
    }
  }

  return [...filtered].sort((a, b) => {
    const valueA = sortValue(a)
    const valueB = sortValue(b)
    if (typeof valueA === 'number' && typeof valueB === 'number') return (valueA - valueB) * sign
    return String(valueA).localeCompare(String(valueB)) * sign
  })
}
