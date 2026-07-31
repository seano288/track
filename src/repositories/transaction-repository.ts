import type { NewTransaction, Transaction, TransactionEdits } from '../domain/transaction.ts'

export interface TransactionRepository {
  createMany(transactions: NewTransaction[]): Promise<Transaction[]>
  list(): Promise<Transaction[]>
  update(id: string, edits: TransactionEdits): Promise<Transaction>
  deleteByAccountId(accountId: string): Promise<void>
}
