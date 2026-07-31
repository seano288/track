import { describe, expect, it } from 'vitest'
import type { NewManualTransaction } from '../domain/transaction.ts'
import { MANUAL_ACCOUNT_ID } from '../domain/transaction.ts'
import { buildManualTransaction } from './add-manual-transaction.ts'

function newManualTransaction(overrides: Partial<NewManualTransaction> = {}): NewManualTransaction {
  return {
    date: '2024-01-02',
    amount: -1500,
    description: 'Farmers market',
    direction: 'expense',
    categoryId: 'category-groceries',
    ...overrides,
  }
}

describe('buildManualTransaction', () => {
  it('assigns the manual sentinel accountId', () => {
    const built = buildManualTransaction(newManualTransaction())

    expect(built.accountId).toBe(MANUAL_ACCOUNT_ID)
  })

  it('carries the typed fields through unchanged', () => {
    const input = newManualTransaction({
      date: '2024-03-15',
      amount: 5000,
      description: 'Birthday cash',
      direction: 'income',
      categoryId: 'category-other',
    })

    const built = buildManualTransaction(input)

    expect(built).toEqual({ ...input, accountId: MANUAL_ACCOUNT_ID })
  })

  it('carries an optional note through', () => {
    const built = buildManualTransaction(newManualTransaction({ note: 'Reimbursed by roommate' }))

    expect(built.note).toBe('Reimbursed by roommate')
  })

  it('omits note when none is given', () => {
    const built = buildManualTransaction(newManualTransaction())

    expect(built.note).toBeUndefined()
  })

  it('never sets a bankTransactionId', () => {
    const built = buildManualTransaction(newManualTransaction())

    expect(built.bankTransactionId).toBeUndefined()
  })
})
