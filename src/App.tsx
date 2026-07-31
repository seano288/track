import { For, Show, createMemo, createResource, createSignal, onMount } from 'solid-js'
import { AddTransaction } from './AddTransaction.tsx'
import { Categories } from './Categories.tsx'
import { deleteCategoryAndReassign } from './categories/delete-category-and-reassign.ts'
import { seedStarterCategories } from './categories/seed-starter-categories.ts'
import { CashFlowSummary } from './CashFlowSummary.tsx'
import { CategoryBreakdown } from './CategoryBreakdown.tsx'
import { CategoryTrend } from './CategoryTrend.tsx'
import { summarizePeriod } from './breakdown/summarize-period.ts'
import { summarizeTrend } from './breakdown/summarize-trend.ts'
import { defaultPeriod } from './domain/period.ts'
import type { NewManualTransaction, TransactionEdits } from './domain/transaction.ts'
import { ImportCsv } from './ImportCsv.tsx'
import { PeriodPicker } from './PeriodPicker.tsx'
import { Rules } from './Rules.tsx'
import { RulePromptHint } from './RulePromptHint.tsx'
import { TransactionList } from './TransactionList.tsx'
import { UncategorizedReview } from './UncategorizedReview.tsx'
import { accountRepository } from './repositories/production-account-repository.ts'
import { categoryRepository } from './repositories/production-category-repository.ts'
import { ruleRepository } from './repositories/production-rule-repository.ts'
import { transactionRepository } from './repositories/production-transaction-repository.ts'
import { buildManualTransaction } from './transactions/add-manual-transaction.ts'
import { validateTransactionEdits } from './transactions/edit-transaction.ts'

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
  const [rules, { refetch: refetchRules }] = createResource(async () => {
    const repository = await ruleRepository
    return repository.list()
  })
  const [name, setName] = createSignal('')
  const [ruleHint, setRuleHint] = createSignal<{ description: string; categoryId: string } | null>(null)
  const [period, setPeriod] = createSignal(defaultPeriod())
  const summary = createMemo(() => summarizePeriod(transactions() ?? [], categories() ?? [], period()))
  const trend = createMemo(() => summarizeTrend(transactions() ?? [], categories() ?? [], period()))

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
    const rulesRepository = await ruleRepository
    await deleteCategoryAndReassign(id, transactions() ?? [], {
      categories: categoriesRepository,
      transactions: transactionsRepository,
      rules: rulesRepository,
    })
    refetchCategories()
    refetchTransactions()
    refetchRules()
  }

  async function handleCreateRule(pattern: string, categoryId: string) {
    const repository = await ruleRepository
    await repository.create({ pattern, categoryId })
    refetchRules()
  }

  async function handleDeleteRule(id: string) {
    const repository = await ruleRepository
    await repository.delete(id)
    refetchRules()
  }

  async function handleCategorizeTransaction(transactionId: string, categoryId: string) {
    const repository = await transactionRepository
    const transaction = transactions()?.find((candidate) => candidate.id === transactionId)
    await repository.update(transactionId, { categoryId })
    refetchTransactions()
    if (transaction) setRuleHint({ description: transaction.description, categoryId })
  }

  async function handleEditTransaction(transactionId: string, edits: TransactionEdits) {
    const transaction = transactions()?.find((candidate) => candidate.id === transactionId)
    if (!transaction) return

    const repository = await transactionRepository
    await repository.update(transactionId, validateTransactionEdits(transaction, edits))
    refetchTransactions()
  }

  async function handleAddTransaction(input: NewManualTransaction) {
    const repository = await transactionRepository
    await repository.createMany([buildManualTransaction(input)])
    refetchTransactions()
  }

  async function handleAcceptRuleHint() {
    const hint = ruleHint()
    if (!hint) return

    await handleCreateRule(hint.description, hint.categoryId)
    setRuleHint(null)
  }

  function handleDismissRuleHint() {
    setRuleHint(null)
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
      <PeriodPicker period={period()} onChange={setPeriod} />
      <CategoryBreakdown breakdown={summary().breakdown} />
      <CashFlowSummary cashFlow={summary().cashFlow} />
      <CategoryTrend trend={trend()} />
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
        rules={rules() ?? []}
        onCreate={handleCreateCategory}
        onRename={handleRenameCategory}
        onDelete={handleDeleteCategory}
      />
      <Rules
        rules={rules() ?? []}
        categories={categories() ?? []}
        onCreate={handleCreateRule}
        onDelete={handleDeleteRule}
      />
      <ImportCsv accounts={accounts() ?? []} onImported={refetchTransactions} />
      <Show when={ruleHint()}>
        {(hint) => (
          <RulePromptHint
            description={hint().description}
            categoryId={hint().categoryId}
            categories={categories() ?? []}
            onAccept={handleAcceptRuleHint}
            onDismiss={handleDismissRuleHint}
          />
        )}
      </Show>
      <UncategorizedReview
        transactions={transactions() ?? []}
        categories={categories() ?? []}
        onCategorize={handleCategorizeTransaction}
      />
      <AddTransaction categories={categories() ?? []} onAdd={handleAddTransaction} />
      <TransactionList
        transactions={transactions() ?? []}
        accounts={accounts() ?? []}
        categories={categories() ?? []}
        onEdit={handleEditTransaction}
      />
    </>
  )
}

export default App
