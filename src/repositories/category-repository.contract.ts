import { describe, expect, it } from 'vitest'
import type { CategoryRepository } from './category-repository.ts'

export function runCategoryRepositoryContract(
  createRepository: () => CategoryRepository | Promise<CategoryRepository>,
) {
  describe('CategoryRepository contract', () => {
    it('starts with an empty list', async () => {
      const repository = await createRepository()

      expect(await repository.list()).toEqual([])
    })

    it('create adds a category, visible via list', async () => {
      const repository = await createRepository()

      const created = await repository.create({ name: 'Groceries' })

      expect(created.name).toBe('Groceries')
      expect(created.id).toBeTruthy()
      expect(await repository.list()).toEqual([created])
    })

    it('list preserves the order categories were created in', async () => {
      const repository = await createRepository()
      const first = await repository.create({ name: 'Groceries' })
      const second = await repository.create({ name: 'Rent' })

      expect(await repository.list()).toEqual([first, second])
    })

    it('rename changes the name and is reflected via list, leaving the id unchanged', async () => {
      const repository = await createRepository()
      const created = await repository.create({ name: 'Groceries' })

      const renamed = await repository.rename(created.id, 'Food')

      expect(renamed).toEqual({ id: created.id, name: 'Food' })
      expect(await repository.list()).toEqual([{ id: created.id, name: 'Food' }])
    })

    it('delete removes the category from the list', async () => {
      const repository = await createRepository()
      const created = await repository.create({ name: 'Groceries' })

      await repository.delete(created.id)

      expect(await repository.list()).toEqual([])
    })
  })
}
