import { createVirtualizer } from '@tanstack/solid-virtual'
import { For, Show, createMemo, createSignal } from 'solid-js'
import type { Account } from './domain/account.ts'
import type { Category } from './domain/category.ts'
import { categoryName } from './domain/category.ts'
import { formatAmount } from './domain/money.ts'
import type { Direction, Transaction, TransactionEdits } from './domain/transaction.ts'
import { DIRECTIONS, UNCATEGORIZED, isManualTransaction } from './domain/transaction.ts'
import type { SortDirection, TransactionSortColumn } from './transactions/filter-sort-transactions.ts'
import { filterSortTransactions } from './transactions/filter-sort-transactions.ts'
import { parseAmountInput } from './transactions/parse-amount-input.ts'

const SORTABLE_COLUMNS: { column: TransactionSortColumn; label: string }[] = [
  { column: 'date', label: 'Date' },
  { column: 'account', label: 'Account' },
  { column: 'description', label: 'Description' },
  { column: 'category', label: 'Category' },
  { column: 'amount', label: 'Amount' },
]

const ROW_HEIGHT_ESTIMATE = 44

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

  const [search, setSearch] = createSignal('')
  const [accountFilter, setAccountFilter] = createSignal('')
  const [categoryFilter, setCategoryFilter] = createSignal('')
  const [directionFilter, setDirectionFilter] = createSignal<Direction | ''>('')
  const [dateStart, setDateStart] = createSignal('')
  const [dateEnd, setDateEnd] = createSignal('')
  const [amountMin, setAmountMin] = createSignal('')
  const [amountMax, setAmountMax] = createSignal('')
  const [uncategorizedOnly, setUncategorizedOnly] = createSignal(false)
  const [sortColumn, setSortColumn] = createSignal<TransactionSortColumn>('date')
  const [sortDirection, setSortDirection] = createSignal<SortDirection>('desc')

  const filtered = createMemo(() =>
    filterSortTransactions(props.transactions, props.accounts, props.categories, {
      search: search() || undefined,
      accountId: accountFilter() || undefined,
      categoryId: categoryFilter() || undefined,
      direction: directionFilter() || undefined,
      dateStart: dateStart() || undefined,
      dateEnd: dateEnd() || undefined,
      amountMin: parseAmountInput(amountMin()),
      amountMax: parseAmountInput(amountMax()),
      uncategorizedOnly: uncategorizedOnly(),
      sortColumn: sortColumn(),
      sortDirection: sortDirection(),
    }),
  )

  function toggleSort(column: TransactionSortColumn) {
    if (sortColumn() === column) {
      setSortDirection(sortDirection() === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  function sortIndicator(column: TransactionSortColumn): string {
    if (sortColumn() !== column) return ''
    return sortDirection() === 'asc' ? ' ▲' : ' ▼'
  }

  let scrollParentRef: HTMLDivElement | undefined

  const rowVirtualizer = createVirtualizer({
    get count() {
      return filtered().length
    },
    getScrollElement: () => scrollParentRef ?? null,
    estimateSize: () => ROW_HEIGHT_ESTIMATE,
    overscan: 12,
    getItemKey: (index) => filtered()[index]?.id ?? index,
  })

  function accountName(accountId: string): string {
    return props.accounts.find((account) => account.id === accountId)?.name ?? accountId
  }

  function categoryPill(transaction: Transaction): { label: string; className: string } {
    if (transaction.direction === 'transfer') return { label: 'Transfer', className: 'pill pill-transfer' }
    if (transaction.categoryId === UNCATEGORIZED) return { label: 'Uncategorized', className: 'pill pill-uncategorized' }
    return { label: categoryName(props.categories, transaction.categoryId), className: 'pill' }
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
      <form class="toolbar" onSubmit={(event) => event.preventDefault()}>
        <input
          value={search()}
          onInput={(event) => setSearch(event.currentTarget.value)}
          placeholder="Search description or note"
          aria-label="Search transactions"
        />
        <select
          value={accountFilter()}
          aria-label="Filter by account"
          onInput={(event) => setAccountFilter(event.currentTarget.value)}
        >
          <option value="">All accounts</option>
          <For each={props.accounts}>{(account) => <option value={account.id}>{account.name}</option>}</For>
        </select>
        <select
          value={categoryFilter()}
          aria-label="Filter by category"
          onInput={(event) => setCategoryFilter(event.currentTarget.value)}
        >
          <option value="">All categories</option>
          <For each={props.categories}>{(category) => <option value={category.id}>{category.name}</option>}</For>
        </select>
        <select
          value={directionFilter()}
          aria-label="Filter by direction"
          onInput={(event) => setDirectionFilter(event.currentTarget.value as Direction | '')}
        >
          <option value="">All directions</option>
          <For each={DIRECTIONS}>{(option) => <option value={option}>{option}</option>}</For>
        </select>
        <input
          type="date"
          value={dateStart()}
          aria-label="From date"
          onInput={(event) => setDateStart(event.currentTarget.value)}
        />
        <input
          type="date"
          value={dateEnd()}
          aria-label="To date"
          onInput={(event) => setDateEnd(event.currentTarget.value)}
        />
        <input
          value={amountMin()}
          aria-label="Minimum amount"
          placeholder="Min amount"
          onInput={(event) => setAmountMin(event.currentTarget.value)}
        />
        <input
          value={amountMax()}
          aria-label="Maximum amount"
          placeholder="Max amount"
          onInput={(event) => setAmountMax(event.currentTarget.value)}
        />
        <label>
          <input
            type="checkbox"
            checked={uncategorizedOnly()}
            onInput={(event) => setUncategorizedOnly(event.currentTarget.checked)}
          />
          Uncategorized only
        </label>
      </form>
      <div class="tx-header">
        <For each={SORTABLE_COLUMNS}>
          {({ column, label }) => (
            <button type="button" class="sortable" onClick={() => toggleSort(column)}>
              {label}
              {sortIndicator(column)}
            </button>
          )}
        </For>
        <span />
      </div>
      <div ref={scrollParentRef} style={{ height: '600px', overflow: 'auto' }}>
        <Show when={filtered().length > 0} fallback={<p>No transactions match.</p>}>
          <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative', width: '100%' }}>
            <For each={rowVirtualizer.getVirtualItems()}>
              {(virtualRow) => {
                const transaction = () => filtered()[virtualRow.index]
                return (
                  <div
                    data-index={virtualRow.index}
                    ref={(element) => rowVirtualizer.measureElement(element)}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <Show when={transaction()}>
                      {(transaction) => (
                        <Show
                          when={editingId() === transaction().id}
                          fallback={
                            <div class="tx-row">
                              <span>{transaction().date}</span>
                              <span>{accountName(transaction().accountId)}</span>
                              <span>
                                <span class="bar-name">{transaction().description}</span>
                                <Show when={transaction().note}>
                                  {(note) => <span class="tx-note"> — {note()}</span>}
                                </Show>
                              </span>
                              <span class={categoryPill(transaction()).className}>{categoryPill(transaction()).label}</span>
                              <span class="tx-amount" classList={{ income: transaction().direction === 'income' }}>
                                {formatAmount(transaction().amount)}
                              </span>
                              <button type="button" onClick={() => startEdit(transaction())}>
                                Edit
                              </button>
                            </div>
                          }
                        >
                          <form onSubmit={(event) => confirmEdit(event, transaction())}>
                            <Show
                              when={isManualTransaction(transaction())}
                              fallback={
                                <>
                                  {transaction().date} — {accountName(transaction().accountId)} —{' '}
                                  {transaction().description} — {formatAmount(transaction().amount)}
                                </>
                              }
                            >
                              <input
                                type="date"
                                value={date()}
                                aria-label={`Date for ${transaction().description}`}
                                onInput={(event) => setDate(event.currentTarget.value)}
                              />
                              {' — '}
                              {accountName(transaction().accountId)}
                              {' — '}
                              <input
                                value={description()}
                                aria-label={`Description for ${transaction().description}`}
                                onInput={(event) => setDescription(event.currentTarget.value)}
                              />
                              {' — '}
                              <input
                                value={amount()}
                                aria-label={`Amount for ${transaction().description}`}
                                onInput={(event) => setAmount(event.currentTarget.value)}
                              />
                            </Show>
                            <select
                              value={direction()}
                              aria-label={`Direction for ${transaction().description}`}
                              onInput={(event) => setDirection(event.currentTarget.value as Direction)}
                            >
                              <For each={DIRECTIONS}>{(option) => <option value={option}>{option}</option>}</For>
                            </select>
                            <select
                              value={categoryId()}
                              aria-label={`Category for ${transaction().description}`}
                              onInput={(event) => setCategoryId(event.currentTarget.value)}
                            >
                              <For each={props.categories}>
                                {(category) => <option value={category.id}>{category.name}</option>}
                              </For>
                            </select>
                            <input
                              value={note()}
                              onInput={(event) => setNote(event.currentTarget.value)}
                              placeholder="Note"
                              aria-label={`Note for ${transaction().description}`}
                            />
                            <button type="submit">Save</button>
                            <button type="button" onClick={() => setEditingId(undefined)}>
                              Cancel
                            </button>
                          </form>
                        </Show>
                      )}
                    </Show>
                  </div>
                )
              }}
            </For>
          </div>
        </Show>
      </div>
    </section>
  )
}
