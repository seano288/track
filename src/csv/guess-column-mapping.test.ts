import { describe, expect, it } from 'vitest'
import { guessColumnMapping } from './guess-column-mapping.ts'

describe('guessColumnMapping', () => {
  it('matches common bank header names case-insensitively', () => {
    expect(guessColumnMapping(['Date', 'Amount', 'Description'])).toEqual({
      dateColumn: 'Date',
      amountColumn: 'Amount',
      descriptionColumn: 'Description',
    })
  })

  it('matches alternate header names used by some banks', () => {
    expect(guessColumnMapping(['Posted Date', 'Transaction Amount', 'Memo'])).toEqual({
      dateColumn: 'Posted Date',
      amountColumn: 'Transaction Amount',
      descriptionColumn: 'Memo',
    })
  })

  it('leaves a field unset when no header matches', () => {
    expect(guessColumnMapping(['Foo', 'Amount', 'Description'])).toEqual({
      dateColumn: undefined,
      amountColumn: 'Amount',
      descriptionColumn: 'Description',
    })
  })
})
