import type { Rule } from '../domain/rule.ts'
import type { NewTransaction } from '../domain/transaction.ts'
import { UNCATEGORIZED } from '../domain/transaction.ts'

// Rules are tried in list order; the first whose pattern is a case-insensitive
// substring of the description wins. Transactions that already carry a
// category (i.e. weren't freshly parsed as Uncategorized) are left alone.
export function applyRules(transactions: NewTransaction[], rules: Rule[]): NewTransaction[] {
  return transactions.map((transaction) => {
    if (transaction.categoryId !== UNCATEGORIZED) return transaction

    const description = transaction.description.toLowerCase()
    const match = rules.find((rule) => description.includes(rule.pattern.toLowerCase()))
    return match ? { ...transaction, categoryId: match.categoryId } : transaction
  })
}
