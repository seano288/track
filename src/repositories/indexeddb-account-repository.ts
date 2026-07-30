import type { Account, NewAccount } from '../domain/account.ts'
import type { AccountRepository } from './account-repository.ts'

const STORE_NAME = 'accounts'
const ID_INDEX = 'id'

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function transactionToPromise(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

// Records are keyed by an internal auto-incrementing key (never exposed on
// Account) so getAll() returns them in creation order, matching the
// in-memory fake. IndexedDB would otherwise order by the `id` UUID.
export class IndexedDBAccountRepository implements AccountRepository {
  readonly #db: IDBDatabase

  private constructor(db: IDBDatabase) {
    this.#db = db
  }

  static async open(databaseName: string): Promise<IndexedDBAccountRepository> {
    const request = indexedDB.open(databaseName, 1)
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE_NAME, {
        autoIncrement: true,
      })
      store.createIndex(ID_INDEX, 'id', { unique: true })
    }
    const db = await requestToPromise(request)
    return new IndexedDBAccountRepository(db)
  }

  async list(): Promise<Account[]> {
    const request = this.#db
      .transaction(STORE_NAME, 'readonly')
      .objectStore(STORE_NAME)
      .getAll()
    const records = await requestToPromise(request)
    return (records as Account[]).map(({ id, name }) => ({ id, name }))
  }

  async create(account: NewAccount): Promise<Account> {
    const created: Account = { id: crypto.randomUUID(), name: account.name }
    const transaction = this.#db.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).add(created)
    await transactionToPromise(transaction)
    return created
  }

  async delete(id: string): Promise<void> {
    const transaction = this.#db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const key = await requestToPromise(store.index(ID_INDEX).getKey(id))
    if (key !== undefined) store.delete(key)
    await transactionToPromise(transaction)
  }
}
