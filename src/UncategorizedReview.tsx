import { For } from 'solid-js'
import type { Category } from './domain/category.ts'
import { formatAmount } from './domain/money.ts'
import type { Transaction } from './domain/transaction.ts'
import { UNCATEGORIZED } from './domain/transaction.ts'

export function UncategorizedReview(props: {
  transactions: Transaction[]
  categories: Category[]
  onCategorize: (transactionId: string, categoryId: string) => void | Promise<void>
}) {
  function uncategorized(): Transaction[] {
    return props.transactions.filter((transaction) => transaction.categoryId === UNCATEGORIZED)
  }

  return (
    <section>
      <h1>Uncategorized</h1>
      <ul>
        <For each={uncategorized()}>
          {(transaction) => (
            <li>
              {transaction.date} — {transaction.description} — {formatAmount(transaction.amount)}
              <select
                value=""
                aria-label={`Assign category to ${transaction.description}`}
                onInput={(event) => props.onCategorize(transaction.id, event.currentTarget.value)}
              >
                <option value="" disabled>
                  Assign a category
                </option>
                <For each={props.categories}>{(category) => <option value={category.id}>{category.name}</option>}</For>
              </select>
            </li>
          )}
        </For>
      </ul>
    </section>
  )
}
