import { describe, expect, it } from 'vitest'
import type { AccountRepository } from './account-repository.ts'

export function runAccountRepositoryContract(
  createRepository: () => AccountRepository | Promise<AccountRepository>,
) {
  describe('AccountRepository contract', () => {
    it('starts with an empty list', async () => {
      const repository = await createRepository()

      expect(await repository.list()).toEqual([])
    })

    it('create adds an account, visible via list', async () => {
      const repository = await createRepository()

      const created = await repository.create({ name: 'Checking' })

      expect(created.name).toBe('Checking')
      expect(created.id).toBeTruthy()
      expect(await repository.list()).toEqual([created])
    })

    it('list preserves the order accounts were created in', async () => {
      const repository = await createRepository()
      const first = await repository.create({ name: 'Checking' })
      const second = await repository.create({ name: 'Savings' })

      expect(await repository.list()).toEqual([first, second])
    })

    it('delete removes the account from the list', async () => {
      const repository = await createRepository()
      const created = await repository.create({ name: 'Checking' })

      await repository.delete(created.id)

      expect(await repository.list()).toEqual([])
    })
  })
}
