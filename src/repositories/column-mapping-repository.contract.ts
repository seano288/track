import { describe, expect, it } from 'vitest'
import type { ColumnMapping } from '../domain/column-mapping.ts'
import type { ColumnMappingRepository } from './column-mapping-repository.ts'

function mapping(overrides: Partial<ColumnMapping> = {}): ColumnMapping {
  return {
    accountId: 'account-checking',
    dateColumn: 'Date',
    amountColumn: 'Amount',
    descriptionColumn: 'Description',
    dateFormat: 'MM/DD/YYYY',
    ...overrides,
  }
}

export function runColumnMappingRepositoryContract(
  createRepository: () => ColumnMappingRepository | Promise<ColumnMappingRepository>,
) {
  describe('ColumnMappingRepository contract', () => {
    it('has no saved mapping for an account until one is saved', async () => {
      const repository = await createRepository()

      expect(await repository.get('account-checking')).toBeUndefined()
    })

    it('save then get returns the saved mapping for that account', async () => {
      const repository = await createRepository()

      await repository.save(mapping())

      expect(await repository.get('account-checking')).toEqual(mapping())
    })

    it('saving again for the same account overwrites the previous mapping', async () => {
      const repository = await createRepository()
      await repository.save(mapping({ dateColumn: 'Date' }))

      await repository.save(mapping({ dateColumn: 'Posted Date' }))

      expect(await repository.get('account-checking')).toEqual(mapping({ dateColumn: 'Posted Date' }))
    })

    it('keeps mappings for different accounts independent', async () => {
      const repository = await createRepository()
      await repository.save(mapping({ accountId: 'account-checking', dateColumn: 'Date' }))
      await repository.save(mapping({ accountId: 'account-savings', dateColumn: 'Posted Date' }))

      expect(await repository.get('account-checking')).toEqual(mapping({ accountId: 'account-checking' }))
      expect(await repository.get('account-savings')).toEqual(
        mapping({ accountId: 'account-savings', dateColumn: 'Posted Date' }),
      )
    })
  })
}
