export interface Category {
  id: string
  name: string
}

export interface NewCategory {
  name: string
}

export function categoryName(categories: Category[], categoryId: string): string {
  return categories.find((category) => category.id === categoryId)?.name ?? categoryId
}

export const STARTER_CATEGORY_NAMES = [
  'Groceries',
  'Dining',
  'Rent',
  'Utilities',
  'Transportation',
  'Entertainment',
  'Health',
  'Salary',
  'Other',
] as const
