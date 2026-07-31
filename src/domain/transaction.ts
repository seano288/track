export type Direction = 'income' | 'expense'

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
  bankTransactionId?: string
}

export interface NewTransaction {
  accountId: string
  date: string
  amount: number
  description: string
  direction: Direction
  categoryId: string
  bankTransactionId?: string
}
