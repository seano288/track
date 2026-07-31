import { describe, expect, it } from 'vitest'
import type { NewTransaction, Transaction } from '../domain/transaction.ts'
import { deduplicateTransactions } from './deduplicate-transactions.ts'

const CHECKING = 'account-checking'

function newTransaction(overrides: Partial<NewTransaction> = {}): NewTransaction {
  return {
    accountId: CHECKING,
    date: '2024-01-02',
    amount: -1234,
    description: 'Coffee shop',
    direction: 'expense',
    categoryId: 'Uncategorized',
    ...overrides,
  }
}

function existingTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return { id: crypto.randomUUID(), ...newTransaction(overrides) }
}

describe('deduplicateTransactions', () => {
  it('treats a candidate matching an existing fingerprint as already-seen', () => {
    const existing = [existingTransaction()]
    const candidates = [newTransaction()]

    const result = deduplicateTransactions(candidates, existing)

    expect(result.newTransactions).toEqual([])
    expect(result.newCount).toBe(0)
    expect(result.duplicateCount).toBe(1)
  })

  it('keeps a candidate with no matching fingerprint as new', () => {
    const existing = [existingTransaction({ description: 'Rent' })]
    const candidates = [newTransaction({ description: 'Groceries' })]

    const result = deduplicateTransactions(candidates, existing)

    expect(result.newTransactions).toEqual(candidates)
    expect(result.newCount).toBe(1)
    expect(result.duplicateCount).toBe(0)
  })

  it('keeps both of two genuinely identical rows in one file when nothing existing overlaps', () => {
    const candidates = [newTransaction(), newTransaction()]

    const result = deduplicateTransactions(candidates, [])

    expect(result.newTransactions).toEqual(candidates)
    expect(result.newCount).toBe(2)
    expect(result.duplicateCount).toBe(0)
  })

  it('matches only up to the count already stored, keeping extra identical rows as new', () => {
    const existing = [existingTransaction()]
    const candidates = [newTransaction(), newTransaction()]

    const result = deduplicateTransactions(candidates, existing)

    expect(result.newTransactions).toEqual([candidates[1]])
    expect(result.newCount).toBe(1)
    expect(result.duplicateCount).toBe(1)
  })

  it('re-importing the exact same file skips every row as already-seen', () => {
    const existing = [existingTransaction(), existingTransaction()]
    const candidates = [newTransaction(), newTransaction()]

    const result = deduplicateTransactions(candidates, existing)

    expect(result.newTransactions).toEqual([])
    expect(result.newCount).toBe(0)
    expect(result.duplicateCount).toBe(2)
  })

  it('uses the bank transaction ID as identity when present, ignoring differing descriptions', () => {
    const existing = [existingTransaction({ bankTransactionId: 'txn-1', description: 'Old memo' })]
    const candidates = [newTransaction({ bankTransactionId: 'txn-1', description: 'New memo' })]

    const result = deduplicateTransactions(candidates, existing)

    expect(result.newTransactions).toEqual([])
    expect(result.duplicateCount).toBe(1)
  })

  it('treats a candidate with a bank transaction ID not seen before as new, even with a matching fingerprint', () => {
    const existing = [existingTransaction({ bankTransactionId: 'txn-1' })]
    const candidates = [newTransaction({ bankTransactionId: 'txn-2' })]

    const result = deduplicateTransactions(candidates, existing)

    expect(result.newTransactions).toEqual(candidates)
    expect(result.newCount).toBe(1)
  })

  it('falls back to fingerprint matching when the mapping has an ID column but a row has a blank ID', () => {
    const existing = [existingTransaction({ bankTransactionId: '' })]
    const candidates = [newTransaction({ bankTransactionId: '' })]

    const result = deduplicateTransactions(candidates, existing)

    expect(result.newTransactions).toEqual([])
    expect(result.duplicateCount).toBe(1)
  })

  it('scopes fingerprint identity by account, so identical rows in different accounts are both new', () => {
    const existing = [existingTransaction({ accountId: 'account-savings' })]
    const candidates = [newTransaction({ accountId: CHECKING })]

    const result = deduplicateTransactions(candidates, existing)

    expect(result.newTransactions).toEqual(candidates)
    expect(result.duplicateCount).toBe(0)
  })
})
