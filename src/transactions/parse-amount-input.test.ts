import { describe, expect, it } from 'vitest'
import { parseAmountInput } from './parse-amount-input.ts'

describe('parseAmountInput', () => {
  it('parses a plain decimal into minor units', () => {
    expect(parseAmountInput('12.34')).toBe(1234)
  })

  it('parses a negative amount', () => {
    expect(parseAmountInput('-12.34')).toBe(-1234)
  })

  it('returns undefined for non-numeric input', () => {
    expect(parseAmountInput('abc')).toBeUndefined()
  })

  it('returns undefined for empty input', () => {
    expect(parseAmountInput('')).toBeUndefined()
  })

  it('returns undefined for whitespace-only input', () => {
    expect(parseAmountInput('   ')).toBeUndefined()
  })
})
