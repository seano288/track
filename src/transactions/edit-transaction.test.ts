import { describe, expect, it } from 'vitest'
import type { Transaction } from '../domain/transaction.ts'
import { MANUAL_ACCOUNT_ID } from '../domain/transaction.ts'
import { validateTransactionEdits } from './edit-transaction.ts'

function transaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'transaction-1',
    accountId: 'account-checking',
    date: '2024-01-02',
    amount: -1234,
    description: 'Coffee shop',
    direction: 'expense',
    categoryId: 'category-groceries',
    ...overrides,
  }
}

function manualTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return transaction({ accountId: MANUAL_ACCOUNT_ID, ...overrides })
}

describe('validateTransactionEdits', () => {
  it('allows category/direction/note edits on an imported transaction', () => {
    const edits = { categoryId: 'category-rent', direction: 'income' as const, note: 'Reimbursed' }

    expect(validateTransactionEdits(transaction(), edits)).toEqual(edits)
  })

  it('rejects a date edit on an imported transaction', () => {
    expect(() => validateTransactionEdits(transaction(), { date: '2024-02-01' })).toThrow()
  })

  it('rejects an amount edit on an imported transaction', () => {
    expect(() => validateTransactionEdits(transaction(), { amount: -999 })).toThrow()
  })

  it('rejects a description edit on an imported transaction', () => {
    expect(() => validateTransactionEdits(transaction(), { description: 'Corrected' })).toThrow()
  })

  it('allows raw-field edits on a manual transaction', () => {
    const edits = { date: '2024-02-01', amount: -999, description: 'Corrected' }

    expect(validateTransactionEdits(manualTransaction(), edits)).toEqual(edits)
  })

  it('allows raw-field and user-owned edits together on a manual transaction', () => {
    const edits = { date: '2024-02-01', amount: -999, description: 'Corrected', categoryId: 'category-rent' }

    expect(validateTransactionEdits(manualTransaction(), edits)).toEqual(edits)
  })
})
