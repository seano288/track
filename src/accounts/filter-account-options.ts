import type { Account } from '../domain/account.ts'

export type AccountOption = { kind: 'existing'; id: string; name: string } | { kind: 'new'; name: string }

export function filterAccountOptions(accounts: Account[], query: string): AccountOption[] {
  const trimmed = query.trim()
  const lower = trimmed.toLowerCase()

  const matches = (trimmed ? accounts.filter((account) => account.name.toLowerCase().includes(lower)) : accounts).map(
    (account): AccountOption => ({ kind: 'existing', id: account.id, name: account.name }),
  )

  if (trimmed && matches.length === 0) {
    matches.push({ kind: 'new', name: trimmed })
  }

  return matches
}
