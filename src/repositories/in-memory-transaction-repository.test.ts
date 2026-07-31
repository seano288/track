import { runTransactionRepositoryContract } from './transaction-repository.contract.ts'
import { InMemoryTransactionRepository } from './in-memory-transaction-repository.ts'

runTransactionRepositoryContract(() => new InMemoryTransactionRepository())
