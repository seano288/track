import type { NewTransaction, Transaction, TransactionEdits } from '../domain/transaction.ts'
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

  async update(id: string, edits: TransactionEdits): Promise<Transaction> {
    const index = this.#transactions.findIndex((transaction) => transaction.id === id)
    if (index === -1) throw new Error(`Transaction not found: ${id}`)

    const updated = { ...this.#transactions[index], ...edits }
    this.#transactions[index] = updated
    return { ...updated }
  }
}
