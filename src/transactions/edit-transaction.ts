import type { Transaction, TransactionEdits } from '../domain/transaction.ts'
import { isManualTransaction } from '../domain/transaction.ts'

const RAW_FIELDS = ['date', 'amount', 'description'] as const

export function validateTransactionEdits(transaction: Transaction, edits: TransactionEdits): TransactionEdits {
  if (isManualTransaction(transaction)) return edits

  const rawField = RAW_FIELDS.find((field) => edits[field] !== undefined)
  if (rawField) {
    throw new Error(`Cannot edit raw field "${rawField}" of an imported transaction: ${transaction.id}`)
  }
  return edits
}
