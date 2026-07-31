import type { Category } from '../domain/category.ts'

export const OVERFLOW_COLOR = 'var(--series-overflow)'

const SERIES_COLORS = [
  'var(--series-1)',
  'var(--series-2)',
  'var(--series-3)',
  'var(--series-4)',
  'var(--series-5)',
  'var(--series-6)',
  'var(--series-7)',
  'var(--series-8)',
]

// Assigns each category a color by its stable position in the given list, not by
// amount/rank in any period-scoped view — so a category keeps the same color across
// screens and periods even as breakdown/trend rows reorder by amount. Categories
// beyond the palette's 8 slots fold into a shared overflow color rather than
// cycling or generating a new hue.
export function assignCategoryColors(categories: Category[]): Map<string, string> {
  const colors = new Map<string, string>()
  categories.forEach((category, index) => {
    colors.set(category.id, SERIES_COLORS[index] ?? OVERFLOW_COLOR)
  })
  return colors
}

export function colorFor(colors: Map<string, string>, categoryId: string): string {
  return colors.get(categoryId) ?? OVERFLOW_COLOR
}
