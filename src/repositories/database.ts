import { requestToPromise } from './indexeddb-utils.ts'

const DATABASE_VERSION = 4

export const STORE_NAMES = {
  accounts: 'accounts',
  transactions: 'transactions',
  columnMappings: 'columnMappings',
  categories: 'categories',
  rules: 'rules',
} as const

// A single database, opened once per repository, holds one object store per
// aggregate. Every store must be created here, in one upgrade path, so that
// two repositories opening the same database name never race over which one
// gets to run the version-bump migration.
export function openDatabase(name: string): Promise<IDBDatabase> {
  const request = indexedDB.open(name, DATABASE_VERSION)
  request.onupgradeneeded = () => {
    const db = request.result
    const upgradeTransaction = request.transaction!

    if (!db.objectStoreNames.contains(STORE_NAMES.accounts)) {
      const accounts = db.createObjectStore(STORE_NAMES.accounts, { autoIncrement: true })
      accounts.createIndex('id', 'id', { unique: true })
    }
    if (!db.objectStoreNames.contains(STORE_NAMES.transactions)) {
      db.createObjectStore(STORE_NAMES.transactions, { autoIncrement: true })
    }
    if (!db.objectStoreNames.contains(STORE_NAMES.columnMappings)) {
      db.createObjectStore(STORE_NAMES.columnMappings, { keyPath: 'accountId' })
    }
    if (!db.objectStoreNames.contains(STORE_NAMES.categories)) {
      const categories = db.createObjectStore(STORE_NAMES.categories, { autoIncrement: true })
      categories.createIndex('id', 'id', { unique: true })
    }
    if (!db.objectStoreNames.contains(STORE_NAMES.rules)) {
      const rules = db.createObjectStore(STORE_NAMES.rules, { autoIncrement: true })
      rules.createIndex('id', 'id', { unique: true })
      rules.createIndex('categoryId', 'categoryId')
    }

    // Added in version 3, for update() lookups by Transaction.id.
    const transactions = upgradeTransaction.objectStore(STORE_NAMES.transactions)
    if (!transactions.indexNames.contains('id')) {
      transactions.createIndex('id', 'id', { unique: true })
    }
  }
  return requestToPromise(request)
}
