import { describe, expect, it } from 'vitest'
import type { NewTransaction } from '../domain/transaction.ts'
import { InMemoryAccountRepository } from '../repositories/in-memory-account-repository.ts'
import { InMemoryTransactionRepository } from '../repositories/in-memory-transaction-repository.ts'
import { deleteAccountAndCascade } from './delete-account-and-cascade.ts'

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
  const accounts = new InMemoryAccountRepository()
  const transactions = new InMemoryTransactionRepository()
  const checking = await accounts.create({ name: 'Checking' })
  return { accounts, transactions, checking }
}

describe('deleteAccountAndCascade', () => {
  it('deletes every transaction belonging to the account', async () => {
    const { accounts, transactions, checking } = await setUp()
    const [coffee, transfer] = await transactions.createMany([
      newTransaction({ accountId: checking.id, description: 'Coffee shop' }),
      newTransaction({ accountId: 'account-savings', description: 'Transfer in' }),
    ])

    await deleteAccountAndCascade(checking.id, await transactions.list(), { accounts, transactions })

    const listed = await transactions.list()
    expect(listed.find((transaction) => transaction.id === coffee.id)).toBeUndefined()
    expect(listed.find((transaction) => transaction.id === transfer.id)).toEqual(transfer)
  })

  it('deletes the account itself', async () => {
    const { accounts, transactions, checking } = await setUp()

    await deleteAccountAndCascade(checking.id, await transactions.list(), { accounts, transactions })

    expect(await accounts.list()).toEqual([])
  })

  it('deletes an account with no transactions, returning a zero count', async () => {
    const { accounts, transactions, checking } = await setUp()

    const affectedCount = await deleteAccountAndCascade(checking.id, await transactions.list(), {
      accounts,
      transactions,
    })

    expect(affectedCount).toBe(0)
    expect(await accounts.list()).toEqual([])
  })

  it('returns the count of deleted transactions', async () => {
    const { accounts, transactions, checking } = await setUp()
    await transactions.createMany([
      newTransaction({ accountId: checking.id, description: 'Coffee shop' }),
      newTransaction({ accountId: checking.id, description: 'Rent' }),
      newTransaction({ accountId: 'account-savings', description: 'Transfer in' }),
    ])

    const affectedCount = await deleteAccountAndCascade(checking.id, await transactions.list(), {
      accounts,
      transactions,
    })

    expect(affectedCount).toBe(2)
  })
})
