import { For } from 'solid-js'
import type { Account } from './domain/account.ts'
import type { Transaction } from './domain/transaction.ts'

export function TransactionList(props: { transactions: Transaction[]; accounts: Account[] }) {
  function accountName(accountId: string): string {
    return props.accounts.find((account) => account.id === accountId)?.name ?? accountId
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
              {formatAmount(transaction.amount)} — {transaction.direction} — {transaction.category}
            </li>
          )}
        </For>
      </ul>
    </section>
  )
}
