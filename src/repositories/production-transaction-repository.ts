import { IndexedDBTransactionRepository } from './indexeddb-transaction-repository.ts'

export const transactionRepository = IndexedDBTransactionRepository.open('track')
