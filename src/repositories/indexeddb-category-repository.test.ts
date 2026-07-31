import 'fake-indexeddb/auto'
import { runCategoryRepositoryContract } from './category-repository.contract.ts'
import { IndexedDBCategoryRepository } from './indexeddb-category-repository.ts'

runCategoryRepositoryContract(() =>
  IndexedDBCategoryRepository.open(`test-categories-${crypto.randomUUID()}`),
)
