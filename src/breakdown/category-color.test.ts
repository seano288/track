import { describe, expect, it } from 'vitest'
import type { Category } from '../domain/category.ts'
import { assignCategoryColors, colorFor, OVERFLOW_COLOR } from './category-color.ts'

function categories(count: number): Category[] {
  return Array.from({ length: count }, (_, index) => ({ id: `c${index}`, name: `Category ${index}` }))
}

describe('assignCategoryColors', () => {
  it('returns an empty map for no categories', () => {
    expect(assignCategoryColors([])).toEqual(new Map())
  })

  it('assigns each category a distinct color by its position in the list', () => {
    const colors = assignCategoryColors(categories(3))

    expect(colors.get('c0')).toBe('var(--series-1)')
    expect(colors.get('c1')).toBe('var(--series-2)')
    expect(colors.get('c2')).toBe('var(--series-3)')
  })

  it('assigns all 8 palette slots without overflow at exactly 8 categories', () => {
    const colors = assignCategoryColors(categories(8))

    expect(colors.get('c7')).toBe('var(--series-8)')
    expect([...colors.values()].every((color) => color !== OVERFLOW_COLOR)).toBe(true)
  })

  it('folds categories beyond the 8th slot into the shared overflow color', () => {
    const colors = assignCategoryColors(categories(10))

    expect(colors.get('c7')).toBe('var(--series-8)')
    expect(colors.get('c8')).toBe(OVERFLOW_COLOR)
    expect(colors.get('c9')).toBe(OVERFLOW_COLOR)
  })

  it('colors follow list position, not amount rank, so unrelated data can reorder without repainting', () => {
    const first = assignCategoryColors(categories(3))
    const sameCategoriesDifferentOrder = assignCategoryColors([...categories(3)])

    expect(sameCategoriesDifferentOrder).toEqual(first)
  })
})

describe('colorFor', () => {
  it('returns the assigned color for a known category', () => {
    const colors = assignCategoryColors(categories(2))

    expect(colorFor(colors, 'c0')).toBe('var(--series-1)')
  })

  it('falls back to the overflow color for an id not in the map', () => {
    const colors = assignCategoryColors(categories(2))

    expect(colorFor(colors, 'unknown')).toBe(OVERFLOW_COLOR)
  })
})
