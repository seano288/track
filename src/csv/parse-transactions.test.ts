import { describe, expect, it } from 'vitest'
import type { ColumnMapping } from '../domain/column-mapping.ts'
import { parseAmountToMinorUnits, parseDate, parseTransactionRows } from './parse-transactions.ts'

describe('parseDate', () => {
  it('parses MM/DD/YYYY into an ISO date string', () => {
    expect(parseDate('1/2/2024', 'MM/DD/YYYY')).toBe('2024-01-02')
  })

  it('parses DD/MM/YYYY into an ISO date string', () => {
    expect(parseDate('1/2/2024', 'DD/MM/YYYY')).toBe('2024-02-01')
  })

  it('parses YYYY-MM-DD into an ISO date string', () => {
    expect(parseDate('2024-1-2', 'YYYY-MM-DD')).toBe('2024-01-02')
  })
})

describe('parseAmountToMinorUnits', () => {
  it('parses a plain decimal amount into integer cents', () => {
    expect(parseAmountToMinorUnits('12.34')).toBe(1234)
  })

  it('preserves a negative sign', () => {
    expect(parseAmountToMinorUnits('-12.34')).toBe(-1234)
  })

  it('strips currency symbols and thousands separators', () => {
    expect(parseAmountToMinorUnits('$1,234.56')).toBe(123456)
  })

  it('treats parenthesized amounts as negative', () => {
    expect(parseAmountToMinorUnits('(12.34)')).toBe(-1234)
  })
})

describe('parseTransactionRows', () => {
  const mapping: ColumnMapping = {
    accountId: 'account-1',
    dateColumn: 'Date',
    amountColumn: 'Amount',
    descriptionColumn: 'Description',
    dateFormat: 'MM/DD/YYYY',
  }

  it('maps rows into new transactions, defaulting direction by sign and category to Uncategorized', () => {
    const rows = [
      { Date: '1/2/2024', Amount: '-12.34', Description: 'Coffee shop' },
      { Date: '1/3/2024', Amount: '500.00', Description: 'Paycheck' },
    ]

    expect(parseTransactionRows(rows, mapping)).toEqual([
      {
        accountId: 'account-1',
        date: '2024-01-02',
        amount: -1234,
        description: 'Coffee shop',
        direction: 'expense',
        category: 'Uncategorized',
      },
      {
        accountId: 'account-1',
        date: '2024-01-03',
        amount: 50000,
        description: 'Paycheck',
        direction: 'income',
        category: 'Uncategorized',
      },
    ])
  })

  it('carries the bank transaction ID when the mapping provides an ID column', () => {
    const mappingWithId: ColumnMapping = { ...mapping, idColumn: 'Transaction ID' }
    const rows = [{ Date: '1/2/2024', Amount: '-12.34', Description: 'Coffee shop', 'Transaction ID': 'txn-001' }]

    expect(parseTransactionRows(rows, mappingWithId)[0].bankTransactionId).toBe('txn-001')
  })

  it('leaves the bank transaction ID undefined when the mapping has no ID column', () => {
    const rows = [{ Date: '1/2/2024', Amount: '-12.34', Description: 'Coffee shop' }]

    expect(parseTransactionRows(rows, mapping)[0].bankTransactionId).toBeUndefined()
  })
})
