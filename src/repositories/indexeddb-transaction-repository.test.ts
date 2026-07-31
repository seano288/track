import 'fake-indexeddb/auto'
import { runTransactionRepositoryContract } from './transaction-repository.contract.ts'
import { IndexedDBTransactionRepository } from './indexeddb-transaction-repository.ts'

runTransactionRepositoryContract(() =>
  IndexedDBTransactionRepository.open(`test-transactions-${crypto.randomUUID()}`),
)
