import type { Category } from '../domain/category.ts'
import { STARTER_CATEGORY_NAMES } from '../domain/category.ts'
import type { CategoryRepository } from '../repositories/category-repository.ts'

export async function seedStarterCategories(repository: CategoryRepository): Promise<Category[]> {
  const existing = await repository.list()
  if (existing.length > 0) return existing

  const seeded: Category[] = []
  for (const name of STARTER_CATEGORY_NAMES) {
    seeded.push(await repository.create({ name }))
  }
  return seeded
}
