import { For, Show, createSignal } from 'solid-js'
import type { Account } from './domain/account.ts'
import type { ColumnMapping, DateFormat } from './domain/column-mapping.ts'
import { deduplicateTransactions } from './csv/deduplicate-transactions.ts'
import { guessColumnMapping } from './csv/guess-column-mapping.ts'
import { parseCsv } from './csv/parse-csv.ts'
import { parseTransactionRows } from './csv/parse-transactions.ts'
import { columnMappingRepository } from './repositories/production-column-mapping-repository.ts'
import { transactionRepository } from './repositories/production-transaction-repository.ts'

const DATE_FORMATS: DateFormat[] = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']
const NO_ID_COLUMN = ''

interface PendingImport {
  accountId: string
  headers: string[]
  rows: Record<string, string>[]
}

interface ImportSummary {
  newCount: number
  duplicateCount: number
}

export function ImportCsv(props: { accounts: Account[]; onImported: () => void }) {
  const [accountId, setAccountId] = createSignal('')
  const [pending, setPending] = createSignal<PendingImport | undefined>(undefined)
  const [dateColumn, setDateColumn] = createSignal('')
  const [amountColumn, setAmountColumn] = createSignal('')
  const [descriptionColumn, setDescriptionColumn] = createSignal('')
  const [idColumn, setIdColumn] = createSignal('')
  const [dateFormat, setDateFormat] = createSignal<DateFormat>('MM/DD/YYYY')
  const [summary, setSummary] = createSignal<ImportSummary | undefined>(undefined)

  async function importRows(rows: Record<string, string>[], mapping: ColumnMapping) {
    const candidates = parseTransactionRows(rows, mapping)
    const repository = await transactionRepository
    const existing = (await repository.list()).filter((transaction) => transaction.accountId === mapping.accountId)
    const { newTransactions, newCount, duplicateCount } = deduplicateTransactions(candidates, existing)
    await repository.createMany(newTransactions)
    setSummary({ newCount, duplicateCount })
    props.onImported()
  }

  async function handleFileSelected(event: Event & { currentTarget: HTMLInputElement }) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    const selectedAccountId = accountId()
    if (!file || !selectedAccountId) return

    const text = await file.text()
    const { headers, rows } = parseCsv(text)
    const repository = await columnMappingRepository
    const existing = await repository.get(selectedAccountId)

    if (existing) {
      await importRows(rows, existing)
      return
    }

    const guess = guessColumnMapping(headers)
    setDateColumn(guess.dateColumn ?? '')
    setAmountColumn(guess.amountColumn ?? '')
    setDescriptionColumn(guess.descriptionColumn ?? '')
    setIdColumn(NO_ID_COLUMN)
    setPending({ accountId: selectedAccountId, headers, rows })
  }

  async function handleConfirmMapping(event: SubmitEvent) {
    event.preventDefault()
    const current = pending()
    if (!current || !dateColumn() || !amountColumn() || !descriptionColumn()) return

    const mapping: ColumnMapping = {
      accountId: current.accountId,
      dateColumn: dateColumn(),
      amountColumn: amountColumn(),
      descriptionColumn: descriptionColumn(),
      dateFormat: dateFormat(),
      idColumn: idColumn() === NO_ID_COLUMN ? undefined : idColumn(),
    }
    const repository = await columnMappingRepository
    await repository.save(mapping)
    setPending(undefined)
    await importRows(current.rows, mapping)
  }

  return (
    <section>
      <h1>Import</h1>
      <label>
        Account
        <select value={accountId()} onInput={(event) => setAccountId(event.currentTarget.value)}>
          <option value="">Select an account</option>
          <For each={props.accounts}>
            {(account) => <option value={account.id}>{account.name}</option>}
          </For>
        </select>
      </label>
      <input
        type="file"
        accept=".csv"
        aria-label="CSV file"
        disabled={!accountId()}
        onChange={handleFileSelected}
      />

      <Show when={pending()}>
        {(current) => (
          <form onSubmit={handleConfirmMapping}>
            <p>Map columns for this account. This is saved and reused for future imports.</p>
            <label>
              Date column
              <select value={dateColumn()} onInput={(event) => setDateColumn(event.currentTarget.value)}>
                <option value="">Select a column</option>
                <For each={current().headers}>{(header) => <option value={header}>{header}</option>}</For>
              </select>
            </label>
            <label>
              Amount column
              <select value={amountColumn()} onInput={(event) => setAmountColumn(event.currentTarget.value)}>
                <option value="">Select a column</option>
                <For each={current().headers}>{(header) => <option value={header}>{header}</option>}</For>
              </select>
            </label>
            <label>
              Description column
              <select
                value={descriptionColumn()}
                onInput={(event) => setDescriptionColumn(event.currentTarget.value)}
              >
                <option value="">Select a column</option>
                <For each={current().headers}>{(header) => <option value={header}>{header}</option>}</For>
              </select>
            </label>
            <label>
              Date format
              <select
                value={dateFormat()}
                onInput={(event) => setDateFormat(event.currentTarget.value as DateFormat)}
              >
                <For each={DATE_FORMATS}>{(format) => <option value={format}>{format}</option>}</For>
              </select>
            </label>
            <label>
              Transaction ID column (optional)
              <select value={idColumn()} onInput={(event) => setIdColumn(event.currentTarget.value)}>
                <option value={NO_ID_COLUMN}>None</option>
                <For each={current().headers}>{(header) => <option value={header}>{header}</option>}</For>
              </select>
            </label>
            <button type="submit">Save mapping and import</button>
          </form>
        )}
      </Show>

      <Show when={summary()}>
        {(current) => (
          <p>
            Imported {current().newCount} new, {current().duplicateCount} already seen.
          </p>
        )}
      </Show>
    </section>
  )
}
