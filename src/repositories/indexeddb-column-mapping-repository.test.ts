import 'fake-indexeddb/auto'
import { runColumnMappingRepositoryContract } from './column-mapping-repository.contract.ts'
import { IndexedDBColumnMappingRepository } from './indexeddb-column-mapping-repository.ts'

runColumnMappingRepositoryContract(() =>
  IndexedDBColumnMappingRepository.open(`test-column-mappings-${crypto.randomUUID()}`),
)
