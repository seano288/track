import { For, Show, createSignal } from 'solid-js'
import type { Category } from './domain/category.ts'
import type { Rule } from './domain/rule.ts'
import type { Transaction } from './domain/transaction.ts'

export function Categories(props: {
  categories: Category[]
  transactions: Transaction[]
  rules: Rule[]
  onCreate: (name: string) => void | Promise<void>
  onRename: (id: string, name: string) => void | Promise<void>
  onDelete: (id: string) => void | Promise<void>
}) {
  const [name, setName] = createSignal('')
  const [renamingId, setRenamingId] = createSignal<string | undefined>(undefined)
  const [renameValue, setRenameValue] = createSignal('')

  function affectedTransactionCount(categoryId: string): number {
    return props.transactions.filter((transaction) => transaction.categoryId === categoryId).length
  }

  function affectedRuleCount(categoryId: string): number {
    return props.rules.filter((rule) => rule.categoryId === categoryId).length
  }

  async function handleCreate(event: SubmitEvent) {
    event.preventDefault()
    const trimmed = name().trim()
    if (!trimmed) return

    await props.onCreate(trimmed)
    setName('')
  }

  function startRename(category: Category) {
    setRenamingId(category.id)
    setRenameValue(category.name)
  }

  async function confirmRename(event: SubmitEvent) {
    event.preventDefault()
    const id = renamingId()
    const trimmed = renameValue().trim()
    if (!id || !trimmed) return

    await props.onRename(id, trimmed)
    setRenamingId(undefined)
  }

  async function handleDelete(category: Category) {
    const transactionCount = affectedTransactionCount(category.id)
    const ruleCount = affectedRuleCount(category.id)
    const clauses = [
      transactionCount > 0 &&
        `${transactionCount} transaction${transactionCount === 1 ? '' : 's'} will be reassigned to Uncategorized`,
      ruleCount > 0 && `${ruleCount} rule${ruleCount === 1 ? '' : 's'} will be removed`,
    ].filter(Boolean)
    const message =
      clauses.length > 0 ? `Delete "${category.name}"? ${clauses.join(' and ')}.` : `Delete "${category.name}"?`
    if (!window.confirm(message)) return

    await props.onDelete(category.id)
  }

  return (
    <section>
      <h1>Categories</h1>
      <form onSubmit={handleCreate}>
        <input
          value={name()}
          onInput={(event) => setName(event.currentTarget.value)}
          placeholder="Category name"
          aria-label="Category name"
        />
        <button type="submit">Add category</button>
      </form>
      <ul>
        <For each={props.categories}>
          {(category) => (
            <li>
              <Show
                when={renamingId() === category.id}
                fallback={
                  <>
                    {category.name}
                    <button type="button" onClick={() => startRename(category)}>
                      Rename
                    </button>
                    <button type="button" onClick={() => handleDelete(category)}>
                      Delete
                    </button>
                  </>
                }
              >
                <form onSubmit={confirmRename}>
                  <input
                    value={renameValue()}
                    onInput={(event) => setRenameValue(event.currentTarget.value)}
                    aria-label={`Rename ${category.name}`}
                  />
                  <button type="submit">Save</button>
                  <button type="button" onClick={() => setRenamingId(undefined)}>
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
