import { IndexedDBColumnMappingRepository } from './indexeddb-column-mapping-repository.ts'

export const columnMappingRepository = IndexedDBColumnMappingRepository.open('track')
