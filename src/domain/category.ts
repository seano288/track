export interface Category {
  id: string
  name: string
}

export interface NewCategory {
  name: string
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
