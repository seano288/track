import { For, createResource, createSignal } from 'solid-js'
import { accountRepository } from './repositories/production-account-repository.ts'

function App() {
  const [accounts, { refetch }] = createResource(async () => {
    const repository = await accountRepository
    return repository.list()
  })
  const [name, setName] = createSignal('')

  async function handleCreate(event: SubmitEvent) {
    event.preventDefault()
    const trimmedName = name().trim()
    if (!trimmedName) return

    const repository = await accountRepository
    await repository.create({ name: trimmedName })
    setName('')
    refetch()
  }

  async function handleDelete(id: string) {
    const repository = await accountRepository
    await repository.delete(id)
    refetch()
  }

  return (
    <section>
      <h1>Accounts</h1>
      <form onSubmit={handleCreate}>
        <input
          value={name()}
          onInput={(event) => setName(event.currentTarget.value)}
          placeholder="Account name"
          aria-label="Account name"
        />
        <button type="submit">Add account</button>
      </form>
      <ul>
        <For each={accounts()}>
          {(account) => (
            <li>
              {account.name}
              <button type="button" onClick={() => handleDelete(account.id)}>
                Delete
              </button>
            </li>
          )}
        </For>
      </ul>
    </section>
  )
}

export default App
