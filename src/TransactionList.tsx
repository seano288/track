import { For, Show, createSignal } from 'solid-js'
import type { Account } from './domain/account.ts'
import type { Category } from './domain/category.ts'
import type { Direction, Transaction, TransactionEdits } from './domain/transaction.ts'
import { DIRECTIONS, isManualTransaction } from './domain/transaction.ts'
import { parseAmountInput } from './transactions/parse-amount-input.ts'

export function TransactionList(props: {
  transactions: Transaction[]
  accounts: Account[]
  categories: Category[]
  onEdit: (transactionId: string, edits: TransactionEdits) => void | Promise<void>
}) {
  const [editingId, setEditingId] = createSignal<string | undefined>(undefined)
  const [date, setDate] = createSignal('')
  const [amount, setAmount] = createSignal('')
  const [description, setDescription] = createSignal('')
  const [categoryId, setCategoryId] = createSignal('')
  const [direction, setDirection] = createSignal<Direction>('expense')
  const [note, setNote] = createSignal('')

  function accountName(accountId: string): string {
    return props.accounts.find((account) => account.id === accountId)?.name ?? accountId
  }

  function categoryName(categoryId: string): string {
    return props.categories.find((category) => category.id === categoryId)?.name ?? categoryId
  }

  function formatAmount(minorUnits: number): string {
    return (minorUnits / 100).toFixed(2)
  }

  function startEdit(transaction: Transaction) {
    setEditingId(transaction.id)
    setDate(transaction.date)
    setAmount(formatAmount(transaction.amount))
    setDescription(transaction.description)
    setCategoryId(transaction.categoryId)
    setDirection(transaction.direction)
    setNote(transaction.note ?? '')
  }

  async function confirmEdit(event: SubmitEvent, transaction: Transaction) {
    event.preventDefault()
    const edits: TransactionEdits = {
      categoryId: categoryId(),
      direction: direction(),
      note: note().trim() || undefined,
    }
    if (isManualTransaction(transaction)) {
      const parsedAmount = parseAmountInput(amount())
      const trimmedDescription = description().trim()
      if (!date() || parsedAmount === undefined || !trimmedDescription) return
      edits.date = date()
      edits.amount = parsedAmount
      edits.description = trimmedDescription
    }
    await props.onEdit(transaction.id, edits)
    setEditingId(undefined)
  }

  return (
    <section>
      <h1>Transactions</h1>
      <ul>
        <For each={props.transactions}>
          {(transaction) => (
            <li>
              <Show
                when={editingId() === transaction.id}
                fallback={
                  <>
                    {transaction.date} — {accountName(transaction.accountId)} — {transaction.description} —{' '}
                    {formatAmount(transaction.amount)} — {transaction.direction} —{' '}
                    {categoryName(transaction.categoryId)}
                    <Show when={transaction.note}>{(note) => <> — {note()}</>}</Show>
                    <button type="button" onClick={() => startEdit(transaction)}>
                      Edit
                    </button>
                  </>
                }
              >
                <form onSubmit={(event) => confirmEdit(event, transaction)}>
                  <Show
                    when={isManualTransaction(transaction)}
                    fallback={
                      <>
                        {transaction.date} — {accountName(transaction.accountId)} — {transaction.description} —{' '}
                        {formatAmount(transaction.amount)}
                      </>
                    }
                  >
                    <input
                      type="date"
                      value={date()}
                      aria-label={`Date for ${transaction.description}`}
                      onInput={(event) => setDate(event.currentTarget.value)}
                    />
                    {' — '}
                    {accountName(transaction.accountId)}
                    {' — '}
                    <input
                      value={description()}
                      aria-label={`Description for ${transaction.description}`}
                      onInput={(event) => setDescription(event.currentTarget.value)}
                    />
                    {' — '}
                    <input
                      value={amount()}
                      aria-label={`Amount for ${transaction.description}`}
                      onInput={(event) => setAmount(event.currentTarget.value)}
                    />
                  </Show>
                  <select
                    value={direction()}
                    aria-label={`Direction for ${transaction.description}`}
                    onInput={(event) => setDirection(event.currentTarget.value as Direction)}
                  >
                    <For each={DIRECTIONS}>{(option) => <option value={option}>{option}</option>}</For>
                  </select>
                  <select
                    value={categoryId()}
                    aria-label={`Category for ${transaction.description}`}
                    onInput={(event) => setCategoryId(event.currentTarget.value)}
                  >
                    <For each={props.categories}>{(category) => <option value={category.id}>{category.name}</option>}</For>
                  </select>
                  <input
                    value={note()}
                    onInput={(event) => setNote(event.currentTarget.value)}
                    placeholder="Note"
                    aria-label={`Note for ${transaction.description}`}
                  />
                  <button type="submit">Save</button>
                  <button type="button" onClick={() => setEditingId(undefined)}>
                    Cancel
                  </button>
                </form>
              </Show>
            </li>
          )}
        </For>
      </ul>
    </section>
  )
}
