import { For, createSignal } from 'solid-js'
import type { Category } from './domain/category.ts'
import { categoryName } from './domain/category.ts'
import type { Rule } from './domain/rule.ts'

export function Rules(props: {
  rules: Rule[]
  categories: Category[]
  onCreate: (pattern: string, categoryId: string) => void | Promise<void>
  onDelete: (id: string) => void | Promise<void>
}) {
  const [pattern, setPattern] = createSignal('')
  const [categoryId, setCategoryId] = createSignal('')

  async function handleCreate(event: SubmitEvent) {
    event.preventDefault()
    const trimmed = pattern().trim()
    if (!trimmed || !categoryId()) return

    await props.onCreate(trimmed, categoryId())
    setPattern('')
  }

  return (
    <section>
      <h1>Rules</h1>
      <form onSubmit={handleCreate}>
        <input
          value={pattern()}
          onInput={(event) => setPattern(event.currentTarget.value)}
          placeholder="Description contains..."
          aria-label="Rule pattern"
        />
        <select
          value={categoryId()}
          onInput={(event) => setCategoryId(event.currentTarget.value)}
          aria-label="Rule category"
        >
          <option value="">Select a category</option>
          <For each={props.categories}>{(category) => <option value={category.id}>{category.name}</option>}</For>
        </select>
        <button type="submit">Add rule</button>
      </form>
      <ul>
        <For each={props.rules}>
          {(rule) => (
            <li>
              {rule.pattern} → {categoryName(props.categories, rule.categoryId)}
              <button type="button" onClick={() => props.onDelete(rule.id)}>
                Delete
              </button>
            </li>
          )}
        </For>
      </ul>
    </section>
  )
}
