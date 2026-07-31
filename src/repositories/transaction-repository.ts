import type { NewTransaction, Transaction } from '../domain/transaction.ts'

export interface TransactionRepository {
  createMany(transactions: NewTransaction[]): Promise<Transaction[]>
  list(): Promise<Transaction[]>
  updateCategory(id: string, categoryId: string): Promise<Transaction>
}
