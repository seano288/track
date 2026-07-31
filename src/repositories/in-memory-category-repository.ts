import type { Category, NewCategory } from '../domain/category.ts'
import type { CategoryRepository } from './category-repository.ts'

export class InMemoryCategoryRepository implements CategoryRepository {
  #categories: Category[] = []

  async list(): Promise<Category[]> {
    return [...this.#categories]
  }

  async create(category: NewCategory): Promise<Category> {
    const created: Category = { id: crypto.randomUUID(), name: category.name }
    this.#categories.push(created)
    return created
  }

  async rename(id: string, name: string): Promise<Category> {
    const category = this.#categories.find((category) => category.id === id)!
    category.name = name
    return { ...category }
  }

  async delete(id: string): Promise<void> {
    this.#categories = this.#categories.filter((category) => category.id !== id)
  }
}
