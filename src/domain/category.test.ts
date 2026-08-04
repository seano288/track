import { describe, expect, it } from 'vitest'
import { categoryName } from './category.ts'

describe('categoryName', () => {
  const categories = [
    { id: 'cat-1', name: 'Groceries' },
    { id: 'cat-2', name: 'Rent' },
  ]

  it('returns the matching category name', () => {
    expect(categoryName(categories, 'cat-2')).toBe('Rent')
  })

  it('falls back to the id when no category matches', () => {
    expect(categoryName(categories, 'missing')).toBe('missing')
  })
})
