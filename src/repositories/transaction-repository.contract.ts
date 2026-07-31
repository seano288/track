import { describe, expect, it } from 'vitest'
import type { NewTransaction } from '../domain/transaction.ts'
import type { TransactionRepository } from './transaction-repository.ts'

const CHECKING = 'account-checking'

function newTransaction(overrides: Partial<NewTransaction> = {}): NewTransaction {
  return {
    accountId: CHECKING,
    date: '2024-01-02',
    amount: -1234,
    description: 'Coffee shop',
    direction: 'expense' as const,
    category: 'Uncategorized',
    ...overrides,
  }
}

export function runTransactionRepositoryContract(
  createRepository: () => TransactionRepository | Promise<TransactionRepository>,
) {
  describe('TransactionRepository contract', () => {
    it('starts with an empty list', async () => {
      const repository = await createRepository()

      expect(await repository.list()).toEqual([])
    })

    it('createMany adds transactions, visible via list, each assigned an id', async () => {
      const repository = await createRepository()

      const created = await repository.createMany([
        newTransaction({ description: 'Coffee shop' }),
        newTransaction({ description: 'Paycheck', amount: 50000, direction: 'income' }),
      ])

      expect(created).toHaveLength(2)
      expect(created[0].id).toBeTruthy()
      expect(created[1].id).toBeTruthy()
      expect(created[0].id).not.toBe(created[1].id)
      expect(await repository.list()).toEqual(created)
    })

    it('list preserves the order transactions were created in', async () => {
      const repository = await createRepository()
      await repository.createMany([newTransaction({ description: 'First' })])
      await repository.createMany([newTransaction({ description: 'Second' })])

      const listed = await repository.list()

      expect(listed.map((transaction) => transaction.description)).toEqual(['First', 'Second'])
    })
  })
}
