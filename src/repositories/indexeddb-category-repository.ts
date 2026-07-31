import type { Category, NewCategory } from '../domain/category.ts'
import type { CategoryRepository } from './category-repository.ts'
import { openDatabase, STORE_NAMES } from './database.ts'
import { requestToPromise, transactionToPromise } from './indexeddb-utils.ts'

const STORE_NAME = STORE_NAMES.categories
const ID_INDEX = 'id'

// Records are keyed by an internal auto-incrementing key (never exposed on
// Category) so getAll() returns them in creation order, matching the
// in-memory fake. IndexedDB would otherwise order by the `id` UUID.
export class IndexedDBCategoryRepository implements CategoryRepository {
  readonly #db: IDBDatabase

  private constructor(db: IDBDatabase) {
    this.#db = db
  }

  static async open(databaseName: string): Promise<IndexedDBCategoryRepository> {
    const db = await openDatabase(databaseName)
    return new IndexedDBCategoryRepository(db)
  }

  async list(): Promise<Category[]> {
    const request = this.#db
      .transaction(STORE_NAME, 'readonly')
      .objectStore(STORE_NAME)
      .getAll()
    const records = await requestToPromise(request)
    return (records as Category[]).map(({ id, name }) => ({ id, name }))
  }

  async create(category: NewCategory): Promise<Category> {
    const created: Category = { id: crypto.randomUUID(), name: category.name }
    const transaction = this.#db.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).add(created)
    await transactionToPromise(transaction)
    return created
  }

  async rename(id: string, name: string): Promise<Category> {
    const transaction = this.#db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const key = (await requestToPromise(store.index(ID_INDEX).getKey(id))) as IDBValidKey
    const renamed: Category = { id, name }
    store.put(renamed, key)
    await transactionToPromise(transaction)
    return renamed
  }

  async delete(id: string): Promise<void> {
    const transaction = this.#db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const key = await requestToPromise(store.index(ID_INDEX).getKey(id))
    if (key !== undefined) store.delete(key)
    await transactionToPromise(transaction)
  }
}
