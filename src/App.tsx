import { For, createResource, createSignal, onMount } from 'solid-js'
import { Categories } from './Categories.tsx'
import { deleteCategoryAndReassign } from './categories/delete-category-and-reassign.ts'
import { seedStarterCategories } from './categories/seed-starter-categories.ts'
import { ImportCsv } from './ImportCsv.tsx'
import { TransactionList } from './TransactionList.tsx'
import { accountRepository } from './repositories/production-account-repository.ts'
import { categoryRepository } from './repositories/production-category-repository.ts'
import { transactionRepository } from './repositories/production-transaction-repository.ts'

function App() {
  const [accounts, { refetch: refetchAccounts }] = createResource(async () => {
    const repository = await accountRepository
    return repository.list()
  })
  const [transactions, { refetch: refetchTransactions }] = createResource(async () => {
    const repository = await transactionRepository
    return repository.list()
  })
  const [categories, { refetch: refetchCategories }] = createResource(async () => {
    const repository = await categoryRepository
    return repository.list()
  })
  const [name, setName] = createSignal('')

  onMount(async () => {
    const repository = await categoryRepository
    await seedStarterCategories(repository)
    refetchCategories()
  })

  async function handleCreateCategory(categoryName: string) {
    const repository = await categoryRepository
    await repository.create({ name: categoryName })
    refetchCategories()
  }

  async function handleRenameCategory(id: string, categoryName: string) {
    const repository = await categoryRepository
    await repository.rename(id, categoryName)
    refetchCategories()
  }

  async function handleDeleteCategory(id: string) {
    const categoriesRepository = await categoryRepository
    const transactionsRepository = await transactionRepository
    await deleteCategoryAndReassign(id, transactions() ?? [], {
      categories: categoriesRepository,
      transactions: transactionsRepository,
    })
    refetchCategories()
    refetchTransactions()
  }

  async function handleCreate(event: SubmitEvent) {
    event.preventDefault()
    const trimmedName = name().trim()
    if (!trimmedName) return

    const repository = await accountRepository
    await repository.create({ name: trimmedName })
    setName('')
    refetchAccounts()
  }

  async function handleDelete(id: string) {
    const repository = await accountRepository
    await repository.delete(id)
    refetchAccounts()
  }

  return (
    <>
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
      <Categories
        categories={categories() ?? []}
        transactions={transactions() ?? []}
        onCreate={handleCreateCategory}
        onRename={handleRenameCategory}
        onDelete={handleDeleteCategory}
      />
      <ImportCsv accounts={accounts() ?? []} onImported={refetchTransactions} />
      <TransactionList transactions={transactions() ?? []} accounts={accounts() ?? []} categories={categories() ?? []} />
    </>
  )
}

export default App
