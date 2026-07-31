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
    amount: { shape: 'single', amountColumn: 'Amount' },
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

  describe('with a debit/credit column shape', () => {
    const debitCreditMapping: ColumnMapping = {
      accountId: 'account-1',
      dateColumn: 'Date',
      amount: { shape: 'debit-credit', debitColumn: 'Debit', creditColumn: 'Credit' },
      descriptionColumn: 'Description',
      dateFormat: 'MM/DD/YYYY',
    }

    it('parses a debit row as a negative expense', () => {
      const rows = [{ Date: '1/2/2024', Debit: '12.34', Credit: '', Description: 'Coffee shop' }]

      expect(parseTransactionRows(rows, debitCreditMapping)[0]).toMatchObject({
        amount: -1234,
        direction: 'expense',
      })
    })

    it('parses a credit row as a positive income', () => {
      const rows = [{ Date: '1/3/2024', Debit: '', Credit: '500.00', Description: 'Paycheck' }]

      expect(parseTransactionRows(rows, debitCreditMapping)[0]).toMatchObject({
        amount: 50000,
        direction: 'income',
      })
    })

    it('treats a debit value already expressed as negative as an expense', () => {
      const rows = [{ Date: '1/2/2024', Debit: '-12.34', Credit: '', Description: 'Coffee shop' }]

      expect(parseTransactionRows(rows, debitCreditMapping)[0]).toMatchObject({
        amount: -1234,
        direction: 'expense',
      })
    })

    it('prefers the debit value when both debit and credit are populated on the same row', () => {
      const rows = [{ Date: '1/2/2024', Debit: '12.34', Credit: '500.00', Description: 'Coffee shop' }]

      expect(parseTransactionRows(rows, debitCreditMapping)[0]).toMatchObject({
        amount: -1234,
        direction: 'expense',
      })
    })
  })
})
