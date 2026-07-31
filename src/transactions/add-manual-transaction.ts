import type { NewManualTransaction, NewTransaction } from '../domain/transaction.ts'
import { MANUAL_ACCOUNT_ID } from '../domain/transaction.ts'

export function buildManualTransaction(input: NewManualTransaction): NewTransaction {
  return { ...input, accountId: MANUAL_ACCOUNT_ID }
}
