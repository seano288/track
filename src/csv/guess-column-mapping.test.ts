import { describe, expect, it } from 'vitest'
import { guessColumnMapping } from './guess-column-mapping.ts'

describe('guessColumnMapping', () => {
  it('matches common bank header names case-insensitively', () => {
    expect(guessColumnMapping(['Date', 'Amount', 'Description'])).toEqual({
      dateColumn: 'Date',
      descriptionColumn: 'Description',
      amount: { shape: 'single', amountColumn: 'Amount' },
    })
  })

  it('matches alternate header names used by some banks', () => {
    expect(guessColumnMapping(['Posted Date', 'Transaction Amount', 'Memo'])).toEqual({
      dateColumn: 'Posted Date',
      descriptionColumn: 'Memo',
      amount: { shape: 'single', amountColumn: 'Transaction Amount' },
    })
  })

  it('leaves a field unset when no header matches', () => {
    expect(guessColumnMapping(['Foo', 'Amount', 'Description'])).toEqual({
      dateColumn: undefined,
      descriptionColumn: 'Description',
      amount: { shape: 'single', amountColumn: 'Amount' },
    })
  })

  it('detects a Withdrawal/Deposit debit-credit pair', () => {
    expect(guessColumnMapping(['Date', 'Withdrawal', 'Deposit', 'Description'])).toEqual({
      dateColumn: 'Date',
      descriptionColumn: 'Description',
      amount: { shape: 'debit-credit', debitColumn: 'Withdrawal', creditColumn: 'Deposit' },
    })
  })

  it('detects a Debit/Credit pair case-insensitively', () => {
    expect(guessColumnMapping(['date', 'debit', 'credit', 'description'])).toEqual({
      dateColumn: 'date',
      descriptionColumn: 'description',
      amount: { shape: 'debit-credit', debitColumn: 'debit', creditColumn: 'credit' },
    })
  })

  it('detects a Payment/Deposit pair', () => {
    expect(guessColumnMapping(['Date', 'Payment', 'Deposit', 'Description'])).toEqual({
      dateColumn: 'Date',
      descriptionColumn: 'Description',
      amount: { shape: 'debit-credit', debitColumn: 'Payment', creditColumn: 'Deposit' },
    })
  })

  it('falls back to single-column guessing when only one side of a pair is present', () => {
    expect(guessColumnMapping(['Date', 'Debit', 'Amount', 'Description'])).toEqual({
      dateColumn: 'Date',
      descriptionColumn: 'Description',
      amount: { shape: 'single', amountColumn: 'Amount' },
    })
  })
})
