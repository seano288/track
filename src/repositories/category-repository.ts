import type { Category, NewCategory } from '../domain/category.ts'

export interface CategoryRepository {
  create(category: NewCategory): Promise<Category>
  list(): Promise<Category[]>
  rename(id: string, name: string): Promise<Category>
  delete(id: string): Promise<void>
}
