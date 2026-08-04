import { describe, expect, it } from 'vitest'
import { formatAmount } from './money.ts'

describe('formatAmount', () => {
  it('renders minor units as a two-decimal major-unit string', () => {
    expect(formatAmount(12345)).toBe('123.45')
  })

  it('pads a whole-dollar amount to two decimals', () => {
    expect(formatAmount(500)).toBe('5.00')
  })

  it('preserves a negative sign', () => {
    expect(formatAmount(-1050)).toBe('-10.50')
  })
})
