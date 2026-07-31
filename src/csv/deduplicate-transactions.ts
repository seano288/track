import type { NewTransaction, Transaction } from '../domain/transaction.ts'

export interface DeduplicationResult {
  newTransactions: NewTransaction[]
  newCount: number
  duplicateCount: number
}

type Identifiable = Pick<NewTransaction, 'accountId' | 'date' | 'amount' | 'description' | 'bankTransactionId'>

// Existing transactions are matched as a multiset (by count, not by removing rows),
// so re-importing an overlapping file skips exactly the rows already stored while
// genuinely identical rows within one file that have no existing counterpart both stay.
export function deduplicateTransactions(candidates: NewTransaction[], existing: Transaction[]): DeduplicationResult {
  const availableCounts = new Map<string, number>()
  for (const transaction of existing) {
    const key = identityKey(transaction)
    availableCounts.set(key, (availableCounts.get(key) ?? 0) + 1)
  }

  const newTransactions: NewTransaction[] = []
  let duplicateCount = 0

  for (const candidate of candidates) {
    const key = identityKey(candidate)
    const available = availableCounts.get(key) ?? 0
    if (available > 0) {
      availableCounts.set(key, available - 1)
      duplicateCount++
    } else {
      newTransactions.push(candidate)
    }
  }

  return { newTransactions, newCount: newTransactions.length, duplicateCount }
}

function identityKey(transaction: Identifiable): string {
  if (transaction.bankTransactionId) {
    return `id:${transaction.accountId}:${transaction.bankTransactionId}`
  }
  return `fp:${transaction.accountId}:${transaction.date}:${transaction.amount}:${transaction.description}`
}
