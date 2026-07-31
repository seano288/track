import { describe, expect, it } from 'vitest'
import type { RuleRepository } from './rule-repository.ts'

export function runRuleRepositoryContract(createRepository: () => RuleRepository | Promise<RuleRepository>) {
  describe('RuleRepository contract', () => {
    it('starts with an empty list', async () => {
      const repository = await createRepository()

      expect(await repository.list()).toEqual([])
    })

    it('create adds a rule, visible via list', async () => {
      const repository = await createRepository()

      const created = await repository.create({ pattern: 'WHOLEFDS', categoryId: 'category-groceries' })

      expect(created.pattern).toBe('WHOLEFDS')
      expect(created.categoryId).toBe('category-groceries')
      expect(created.id).toBeTruthy()
      expect(await repository.list()).toEqual([created])
    })

    it('list preserves the order rules were created in', async () => {
      const repository = await createRepository()
      const first = await repository.create({ pattern: 'WHOLEFDS', categoryId: 'category-groceries' })
      const second = await repository.create({ pattern: 'NETFLIX', categoryId: 'category-entertainment' })

      expect(await repository.list()).toEqual([first, second])
    })

    it('delete removes the rule from the list', async () => {
      const repository = await createRepository()
      const created = await repository.create({ pattern: 'WHOLEFDS', categoryId: 'category-groceries' })

      await repository.delete(created.id)

      expect(await repository.list()).toEqual([])
    })

    it('deleteByCategoryId removes every rule targeting that category, leaving others untouched', async () => {
      const repository = await createRepository()
      const groceries = await repository.create({ pattern: 'WHOLEFDS', categoryId: 'category-groceries' })
      const entertainment = await repository.create({ pattern: 'NETFLIX', categoryId: 'category-entertainment' })
      await repository.create({ pattern: 'TRADER JOE', categoryId: groceries.categoryId })

      await repository.deleteByCategoryId(groceries.categoryId)

      expect(await repository.list()).toEqual([entertainment])
    })
  })
}
