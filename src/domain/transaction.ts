export type Direction = 'income' | 'expense' | 'transfer'

// Not a Category record — a fixed sentinel categoryId for "no category
// assigned yet", so it survives Category renames/deletes untouched.
export const UNCATEGORIZED = 'Uncategorized'

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

// The only fields a user can change on a Transaction. Raw fields — date,
// amount, description — stay immutable so imports always match the source CSV.
export interface TransactionEdits {
  categoryId?: string
  direction?: Direction
  note?: string
}
