import type { ColumnMapping } from '../domain/column-mapping.ts'
import type { ColumnMappingRepository } from './column-mapping-repository.ts'
import { openDatabase, STORE_NAMES } from './database.ts'
import { requestToPromise, transactionToPromise } from './indexeddb-utils.ts'

const STORE_NAME = STORE_NAMES.columnMappings

export class IndexedDBColumnMappingRepository implements ColumnMappingRepository {
  readonly #db: IDBDatabase

  private constructor(db: IDBDatabase) {
    this.#db = db
  }

  static async open(databaseName: string): Promise<IndexedDBColumnMappingRepository> {
    const db = await openDatabase(databaseName)
    return new IndexedDBColumnMappingRepository(db)
  }

  async get(accountId: string): Promise<ColumnMapping | undefined> {
    const request = this.#db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(accountId)
    return requestToPromise(request)
  }

  async save(mapping: ColumnMapping): Promise<ColumnMapping> {
    const dbTransaction = this.#db.transaction(STORE_NAME, 'readwrite')
    dbTransaction.objectStore(STORE_NAME).put(mapping)
    await transactionToPromise(dbTransaction)
    return mapping
  }
}
