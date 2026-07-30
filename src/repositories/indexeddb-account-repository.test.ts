import 'fake-indexeddb/auto'
import { runAccountRepositoryContract } from './account-repository.contract.ts'
import { IndexedDBAccountRepository } from './indexeddb-account-repository.ts'

runAccountRepositoryContract(() =>
  IndexedDBAccountRepository.open(`test-accounts-${crypto.randomUUID()}`),
)
