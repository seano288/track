import { describe, expect, it } from 'vitest'
import type { Account } from '../domain/account.ts'
import { filterAccountOptions } from './filter-account-options.ts'

const ACCOUNTS: Account[] = [
  { id: '1', name: 'Checking' },
  { id: '2', name: 'Savings' },
]

describe('filterAccountOptions', () => {
  it('lists every account as an existing option when the query is empty', () => {
    expect(filterAccountOptions(ACCOUNTS, '')).toEqual([
      { kind: 'existing', id: '1', name: 'Checking' },
      { kind: 'existing', id: '2', name: 'Savings' },
    ])
  })

  it('treats a whitespace-only query the same as empty', () => {
    expect(filterAccountOptions(ACCOUNTS, '   ')).toEqual([
      { kind: 'existing', id: '1', name: 'Checking' },
      { kind: 'existing', id: '2', name: 'Savings' },
    ])
  })

  it('filters to accounts whose name contains the query, case-insensitively', () => {
    expect(filterAccountOptions(ACCOUNTS, 'check')).toEqual([{ kind: 'existing', id: '1', name: 'Checking' }])
  })

  it('appends a create option when no account matches the query', () => {
    expect(filterAccountOptions(ACCOUNTS, 'Credit Card')).toEqual([
      { kind: 'new', name: 'Credit Card' },
    ])
  })

  it('trims the query before using it as the create option name', () => {
    expect(filterAccountOptions(ACCOUNTS, '  Credit Card  ')).toEqual([
      { kind: 'new', name: 'Credit Card' },
    ])
  })

  it('does not append a create option when the query matches an existing account, case-insensitively', () => {
    expect(filterAccountOptions(ACCOUNTS, 'checking')).toEqual([{ kind: 'existing', id: '1', name: 'Checking' }])
  })

  it('does not append a create option when the query is a substring of an existing account name', () => {
    expect(filterAccountOptions(ACCOUNTS, 'S')).toEqual([{ kind: 'existing', id: '2', name: 'Savings' }])
  })
})
