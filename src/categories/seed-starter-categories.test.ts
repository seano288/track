import { describe, expect, it } from 'vitest'
import { STARTER_CATEGORY_NAMES } from '../domain/category.ts'
import { InMemoryCategoryRepository } from '../repositories/in-memory-category-repository.ts'
import { seedStarterCategories } from './seed-starter-categories.ts'

describe('seedStarterCategories', () => {
  it('creates the starter set when no categories exist yet', async () => {
    const repository = new InMemoryCategoryRepository()

    const seeded = await seedStarterCategories(repository)

    expect(seeded.map((category) => category.name)).toEqual([...STARTER_CATEGORY_NAMES])
    expect(await repository.list()).toEqual(seeded)
  })

  it('does nothing when categories already exist, returning the existing list', async () => {
    const repository = new InMemoryCategoryRepository()
    const existing = await repository.create({ name: 'Groceries' })

    const seeded = await seedStarterCategories(repository)

    expect(seeded).toEqual([existing])
    expect(await repository.list()).toEqual([existing])
  })
})
