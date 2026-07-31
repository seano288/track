import { requestToPromise } from './indexeddb-utils.ts'

const DATABASE_VERSION = 2

export const STORE_NAMES = {
  accounts: 'accounts',
  transactions: 'transactions',
  columnMappings: 'columnMappings',
} as const

// A single database, opened once per repository, holds one object store per
// aggregate. Every store must be created here, in one upgrade path, so that
// two repositories opening the same database name never race over which one
// gets to run the version-bump migration.
export function openDatabase(name: string): Promise<IDBDatabase> {
  const request = indexedDB.open(name, DATABASE_VERSION)
  request.onupgradeneeded = () => {
    const db = request.result

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
  }
  return requestToPromise(request)
}
