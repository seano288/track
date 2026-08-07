import { For, Show, createMemo, createResource, createSignal, onMount } from 'solid-js'
import { AddTransaction } from './AddTransaction.tsx'
import { deleteAccountAndCascade } from './accounts/delete-account-and-cascade.ts'
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
import { StorageWarningBanner } from './StorageWarningBanner.tsx'
import { TransactionList } from './TransactionList.tsx'
import { UncategorizedReview } from './UncategorizedReview.tsx'
import { accountRepository } from './repositories/production-account-repository.ts'
import { categoryRepository } from './repositories/production-category-repository.ts'
import { ruleRepository } from './repositories/production-rule-repository.ts'
import { transactionRepository } from './repositories/production-transaction-repository.ts'
import { buildManualTransaction } from './transactions/add-manual-transaction.ts'
import { validateTransactionEdits } from './transactions/edit-transaction.ts'

type Tab = 'overview' | 'trends' | 'transactions' | 'categories' | 'rules' | 'accounts'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'trends', label: 'Trends' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'categories', label: 'Categories' },
  { id: 'rules', label: 'Rules' },
  { id: 'accounts', label: 'Accounts' },
]

function App() {
  const [tab, setTab] = createSignal<Tab>('overview')
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

  async function handleDelete(id: string) {
    const account = accounts()?.find((candidate) => candidate.id === id)
    if (!account) return

    const transactionCount = (transactions() ?? []).filter((transaction) => transaction.accountId === id).length
    const message =
      transactionCount > 0
        ? `Delete "${account.name}"? ${transactionCount} transaction${transactionCount === 1 ? '' : 's'} will be removed.`
        : `Delete "${account.name}"?`
    if (!window.confirm(message)) return

    const accountsRepository = await accountRepository
    const transactionsRepository = await transactionRepository
    await deleteAccountAndCascade(id, transactions() ?? [], {
      accounts: accountsRepository,
      transactions: transactionsRepository,
    })
    refetchAccounts()
    refetchTransactions()
  }

  return (
    <>
      <StorageWarningBanner />
      <div class="app-shell">
        <aside class="sidebar">
          <div class="brand">
            Track<span>.</span>
          </div>
          <nav class="nav">
            <For each={TABS}>
              {(candidate) => (
                <button type="button" classList={{ active: tab() === candidate.id }} onClick={() => setTab(candidate.id)}>
                  {candidate.label}
                </button>
              )}
            </For>
          </nav>
        </aside>
        <main class="main">
          <Show when={tab() === 'overview'}>
            <PeriodPicker period={period()} onChange={setPeriod} />
            <CashFlowSummary cashFlow={summary().cashFlow} />
            <CategoryBreakdown breakdown={summary().breakdown} categories={categories() ?? []} />
          </Show>
          <Show when={tab() === 'trends'}>
            <CategoryTrend trend={trend()} categories={categories() ?? []} />
          </Show>
          <Show when={tab() === 'transactions'}>
            <AddTransaction categories={categories() ?? []} onAdd={handleAddTransaction} />
            <UncategorizedReview
              transactions={transactions() ?? []}
              categories={categories() ?? []}
              onCategorize={handleCategorizeTransaction}
            />
            <TransactionList
              transactions={transactions() ?? []}
              accounts={accounts() ?? []}
              categories={categories() ?? []}
              onEdit={handleEditTransaction}
            />
          </Show>
          <Show when={tab() === 'categories'}>
            <Categories
              categories={categories() ?? []}
              transactions={transactions() ?? []}
              rules={rules() ?? []}
              onCreate={handleCreateCategory}
              onRename={handleRenameCategory}
              onDelete={handleDeleteCategory}
            />
          </Show>
          <Show when={tab() === 'rules'}>
            <Rules
              rules={rules() ?? []}
              categories={categories() ?? []}
              onCreate={handleCreateRule}
              onDelete={handleDeleteRule}
            />
          </Show>
          <Show when={tab() === 'accounts'}>
            <section>
              <h1>Accounts</h1>
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
            <ImportCsv
              accounts={accounts() ?? []}
              onImported={refetchTransactions}
              onAccountCreated={refetchAccounts}
            />
          </Show>
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
        </main>
      </div>
    </>
  )
}

export default App
