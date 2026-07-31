import { For } from 'solid-js'
import type { Account } from './domain/account.ts'
import type { Category } from './domain/category.ts'
import type { Transaction } from './domain/transaction.ts'

export function TransactionList(props: { transactions: Transaction[]; accounts: Account[]; categories: Category[] }) {
  function accountName(accountId: string): string {
    return props.accounts.find((account) => account.id === accountId)?.name ?? accountId
  }

  function categoryName(categoryId: string): string {
    return props.categories.find((category) => category.id === categoryId)?.name ?? categoryId
  }

  function formatAmount(minorUnits: number): string {
    return (minorUnits / 100).toFixed(2)
  }

  return (
    <section>
      <h1>Transactions</h1>
      <ul>
        <For each={props.transactions}>
          {(transaction) => (
            <li>
              {transaction.date} — {accountName(transaction.accountId)} — {transaction.description} —{' '}
              {formatAmount(transaction.amount)} — {transaction.direction} — {categoryName(transaction.categoryId)}
            </li>
          )}
        </For>
      </ul>
    </section>
  )
}
