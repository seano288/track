import type { ColumnMapping } from '../domain/column-mapping.ts'
import type { ColumnMappingRepository } from './column-mapping-repository.ts'

export class InMemoryColumnMappingRepository implements ColumnMappingRepository {
  #mappingsByAccountId = new Map<string, ColumnMapping>()

  async get(accountId: string): Promise<ColumnMapping | undefined> {
    return this.#mappingsByAccountId.get(accountId)
  }

  async save(mapping: ColumnMapping): Promise<ColumnMapping> {
    this.#mappingsByAccountId.set(mapping.accountId, mapping)
    return mapping
  }
}
