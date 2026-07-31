import type { NewTransaction, Transaction } from '../domain/transaction.ts'
import type { TransactionRepository } from './transaction-repository.ts'

export class InMemoryTransactionRepository implements TransactionRepository {
  #transactions: Transaction[] = []

  async list(): Promise<Transaction[]> {
    return [...this.#transactions]
  }

  async createMany(transactions: NewTransaction[]): Promise<Transaction[]> {
    const created = transactions.map((transaction) => ({ id: crypto.randomUUID(), ...transaction }))
    this.#transactions.push(...created)
    return created
  }
}
