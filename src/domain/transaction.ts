export type Direction = 'income' | 'expense'

export const UNCATEGORIZED = 'Uncategorized'

export interface Transaction {
  id: string
  accountId: string
  date: string
  amount: number
  description: string
  direction: Direction
  category: string
}

export interface NewTransaction {
  accountId: string
  date: string
  amount: number
  description: string
  direction: Direction
  category: string
}
