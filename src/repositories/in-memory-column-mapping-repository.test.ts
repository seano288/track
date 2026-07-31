import { runColumnMappingRepositoryContract } from './column-mapping-repository.contract.ts'
import { InMemoryColumnMappingRepository } from './in-memory-column-mapping-repository.ts'

runColumnMappingRepositoryContract(() => new InMemoryColumnMappingRepository())
