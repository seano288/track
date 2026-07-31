export type Direction = 'income' | 'expense' | 'transfer'

export const DIRECTIONS: Direction[] = ['income', 'expense', 'transfer']

// Not a Category record — a fixed sentinel categoryId for "no category
// assigned yet", so it survives Category renames/deletes untouched.
export const UNCATEGORIZED = 'Uncategorized'

// Not a real Account record — a fixed sentinel accountId for hand-entered
// Transactions, so they display like any other Account without the user
// having to create one, and so isManualTransaction can tell them apart from
// imported Transactions without a separate field.
export const MANUAL_ACCOUNT_ID = 'Manual'

export interface Transaction {
  id: string
  accountId: string
  date: string
  amount: number
  description: string
  direction: Direction
  categoryId: string
  note?: string
  bankTransactionId?: string
}

export interface NewTransaction {
  accountId: string
  date: string
  amount: number
  description: string
  direction: Direction
  categoryId: string
  note?: string
  bankTransactionId?: string
}

// The fields a user types in when adding a Transaction by hand. accountId is
// not here — it's assigned automatically to MANUAL_ACCOUNT_ID.
export interface NewManualTransaction {
  date: string
  amount: number
  description: string
  direction: Direction
  categoryId: string
  note?: string
}

export function isManualTransaction(transaction: Pick<Transaction, 'accountId'>): boolean {
  return transaction.accountId === MANUAL_ACCOUNT_ID
}

// The fields a user can change on a Transaction. Raw fields — date, amount,
// description — may only be edited on a manual Transaction (see
// isManualTransaction); imported Transactions keep them immutable so imports
// always match the source CSV.
export interface TransactionEdits {
  date?: string
  amount?: number
  description?: string
  categoryId?: string
  direction?: Direction
  note?: string
}
