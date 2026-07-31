import type { ColumnMapping } from '../domain/column-mapping.ts'

export interface ColumnMappingRepository {
  get(accountId: string): Promise<ColumnMapping | undefined>
  save(mapping: ColumnMapping): Promise<ColumnMapping>
}
