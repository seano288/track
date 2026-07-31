import { describe, expect, it } from 'vitest'
import type { NewTransaction } from '../domain/transaction.ts'
import { UNCATEGORIZED } from '../domain/transaction.ts'
import { InMemoryCategoryRepository } from '../repositories/in-memory-category-repository.ts'
import { InMemoryTransactionRepository } from '../repositories/in-memory-transaction-repository.ts'
import { deleteCategoryAndReassign } from './delete-category-and-reassign.ts'

function newTransaction(overrides: Partial<NewTransaction> = {}): NewTransaction {
  return {
    accountId: 'account-checking',
    date: '2024-01-02',
    amount: -1234,
    description: 'Coffee shop',
    direction: 'expense',
    categoryId: 'category-groceries',
    ...overrides,
  }
}

async function setUp() {
  const categories = new InMemoryCategoryRepository()
  const transactions = new InMemoryTransactionRepository()
  const groceries = await categories.create({ name: 'Groceries' })
  return { categories, transactions, groceries }
}

describe('deleteCategoryAndReassign', () => {
  it('reassigns every transaction in the deleted category to Uncategorized', async () => {
    const { categories, transactions, groceries } = await setUp()
    const [coffee, rent] = await transactions.createMany([
      newTransaction({ categoryId: groceries.id, description: 'Coffee shop' }),
      newTransaction({ categoryId: 'category-rent', description: 'Rent' }),
    ])

    const affectedCount = await deleteCategoryAndReassign(groceries.id, await transactions.list(), {
      categories,
      transactions,
    })

    expect(affectedCount).toBe(1)
    const listed = await transactions.list()
    expect(listed.find((transaction) => transaction.id === coffee.id)?.categoryId).toBe(UNCATEGORIZED)
    expect(listed.find((transaction) => transaction.id === rent.id)?.categoryId).toBe('category-rent')
  })

  it('deletes the category itself', async () => {
    const { categories, transactions, groceries } = await setUp()

    await deleteCategoryAndReassign(groceries.id, await transactions.list(), { categories, transactions })

    expect(await categories.list()).toEqual([])
  })

  it('deletes a category with no transactions, returning a zero count', async () => {
    const { categories, transactions, groceries } = await setUp()

    const affectedCount = await deleteCategoryAndReassign(groceries.id, await transactions.list(), {
      categories,
      transactions,
    })

    expect(affectedCount).toBe(0)
    expect(await categories.list()).toEqual([])
  })

  it('leaves transactions already Uncategorized untouched', async () => {
    const { categories, transactions, groceries } = await setUp()
    const [uncategorized] = await transactions.createMany([
      newTransaction({ categoryId: UNCATEGORIZED, description: 'Mystery charge' }),
    ])

    await deleteCategoryAndReassign(groceries.id, await transactions.list(), { categories, transactions })

    const listed = await transactions.list()
    expect(listed.find((transaction) => transaction.id === uncategorized.id)?.categoryId).toBe(UNCATEGORIZED)
  })
})
