import type { NewRule, Rule } from '../domain/rule.ts'
import type { RuleRepository } from './rule-repository.ts'
import { openDatabase, STORE_NAMES } from './database.ts'
import { requestToPromise, transactionToPromise } from './indexeddb-utils.ts'

const STORE_NAME = STORE_NAMES.rules
const ID_INDEX = 'id'
const CATEGORY_ID_INDEX = 'categoryId'

// Records are keyed by an internal auto-incrementing key (never exposed on
// Rule) so getAll() returns them in creation order, matching the in-memory fake.
export class IndexedDBRuleRepository implements RuleRepository {
  readonly #db: IDBDatabase

  private constructor(db: IDBDatabase) {
    this.#db = db
  }

  static async open(databaseName: string): Promise<IndexedDBRuleRepository> {
    const db = await openDatabase(databaseName)
    return new IndexedDBRuleRepository(db)
  }

  async list(): Promise<Rule[]> {
    const request = this.#db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll()
    return requestToPromise(request)
  }

  async create(rule: NewRule): Promise<Rule> {
    const created: Rule = { id: crypto.randomUUID(), ...rule }
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

  async deleteByCategoryId(categoryId: string): Promise<void> {
    const transaction = this.#db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const keys = await requestToPromise(store.index(CATEGORY_ID_INDEX).getAllKeys(categoryId))
    for (const key of keys) store.delete(key)
    await transactionToPromise(transaction)
  }
}
