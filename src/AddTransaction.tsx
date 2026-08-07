import { For, Show, createSignal } from 'solid-js'
import type { Category } from './domain/category.ts'
import type { Direction, NewManualTransaction } from './domain/transaction.ts'
import { DIRECTIONS } from './domain/transaction.ts'
import { parseAmountInput } from './transactions/parse-amount-input.ts'

export function AddTransaction(props: {
  categories: Category[]
  onAdd: (transaction: NewManualTransaction) => void | Promise<void>
}) {
  const [date, setDate] = createSignal('')
  const [amount, setAmount] = createSignal('')
  const [description, setDescription] = createSignal('')
  const [categoryId, setCategoryId] = createSignal('')
  const [direction, setDirection] = createSignal<Direction>('expense')
  const [note, setNote] = createSignal('')
  const [expanded, setExpanded] = createSignal(false)

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault()
    const trimmedDescription = description().trim()
    const parsedAmount = parseAmountInput(amount())
    if (!date() || parsedAmount === undefined || !trimmedDescription || !categoryId()) return

    await props.onAdd({
      date: date(),
      amount: parsedAmount,
      description: trimmedDescription,
      direction: direction(),
      categoryId: categoryId(),
      note: note().trim() || undefined,
    })

    setDate('')
    setAmount('')
    setDescription('')
    setCategoryId('')
    setDirection('expense')
    setNote('')
  }

  return (
    <section>
      <button type="button" aria-expanded={expanded()} onClick={() => setExpanded(!expanded())}>
        + Add transaction manually
      </button>
      <Show when={expanded()}>
        <h1>Add transaction</h1>
        <form onSubmit={handleSubmit}>
          <input
            type="date"
            value={date()}
            onInput={(event) => setDate(event.currentTarget.value)}
            aria-label="Date"
          />
          <input
            value={amount()}
            onInput={(event) => setAmount(event.currentTarget.value)}
            placeholder="Amount"
            aria-label="Amount"
          />
          <input
            value={description()}
            onInput={(event) => setDescription(event.currentTarget.value)}
            placeholder="Description"
            aria-label="Description"
          />
          <select
            value={direction()}
            aria-label="Direction"
            onInput={(event) => setDirection(event.currentTarget.value as Direction)}
          >
            <For each={DIRECTIONS}>{(option) => <option value={option}>{option}</option>}</For>
          </select>
          <select
            value={categoryId()}
            aria-label="Category"
            onInput={(event) => setCategoryId(event.currentTarget.value)}
          >
            <option value="">Select a category</option>
            <For each={props.categories}>{(category) => <option value={category.id}>{category.name}</option>}</For>
          </select>
          <input
            value={note()}
            onInput={(event) => setNote(event.currentTarget.value)}
            placeholder="Note"
            aria-label="Note"
          />
          <button type="submit">Add transaction</button>
        </form>
      </Show>
    </section>
  )
}
