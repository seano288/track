import type { NewTransaction, Transaction } from '../domain/transaction.ts'
import type { TransactionRepository } from './transaction-repository.ts'
import { openDatabase, STORE_NAMES } from './database.ts'
import { requestToPromise, transactionToPromise } from './indexeddb-utils.ts'

const STORE_NAME = STORE_NAMES.transactions
const ID_INDEX = 'id'

// Records are keyed by an internal auto-incrementing key (never exposed on
// Transaction) so getAll() returns them in creation order, matching the
// in-memory fake.
export class IndexedDBTransactionRepository implements TransactionRepository {
  readonly #db: IDBDatabase

  private constructor(db: IDBDatabase) {
    this.#db = db
  }

  static async open(databaseName: string): Promise<IndexedDBTransactionRepository> {
    const db = await openDatabase(databaseName)
    return new IndexedDBTransactionRepository(db)
  }

  async list(): Promise<Transaction[]> {
    const request = this.#db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll()
    return requestToPromise(request)
  }

  async createMany(transactions: NewTransaction[]): Promise<Transaction[]> {
    const created = transactions.map((transaction) => ({ id: crypto.randomUUID(), ...transaction }))
    const dbTransaction = this.#db.transaction(STORE_NAME, 'readwrite')
    const store = dbTransaction.objectStore(STORE_NAME)
    for (const transaction of created) store.add(transaction)
    await transactionToPromise(dbTransaction)
    return created
  }

  async updateCategory(id: string, categoryId: string): Promise<Transaction> {
    const dbTransaction = this.#db.transaction(STORE_NAME, 'readwrite')
    const store = dbTransaction.objectStore(STORE_NAME)
    const key = (await requestToPromise(store.index(ID_INDEX).getKey(id))) as IDBValidKey
    const existing = (await requestToPromise(store.get(key))) as Transaction
    const updated: Transaction = { ...existing, categoryId }
    store.put(updated, key)
    await transactionToPromise(dbTransaction)
    return updated
  }
}
