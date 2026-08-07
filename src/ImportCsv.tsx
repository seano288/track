import { For, Show, createSignal } from 'solid-js'
import type { Account } from './domain/account.ts'
import type { AmountMapping, ColumnMapping, DateFormat } from './domain/column-mapping.ts'
import { AccountCombobox, type AccountSelection } from './AccountCombobox.tsx'
import { deduplicateTransactions } from './csv/deduplicate-transactions.ts'
import { guessColumnMapping } from './csv/guess-column-mapping.ts'
import { parseCsv } from './csv/parse-csv.ts'
import { parseTransactionRows } from './csv/parse-transactions.ts'
import { applyRules } from './rules/apply-rules.ts'
import { accountRepository } from './repositories/production-account-repository.ts'
import { columnMappingRepository } from './repositories/production-column-mapping-repository.ts'
import { ruleRepository } from './repositories/production-rule-repository.ts'
import { transactionRepository } from './repositories/production-transaction-repository.ts'

const DATE_FORMATS: DateFormat[] = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']
const NO_ID_COLUMN = ''

interface PendingImport {
  account: AccountSelection
  headers: string[]
  rows: Record<string, string>[]
}

interface ImportSummary {
  newCount: number
  duplicateCount: number
}

export function ImportCsv(props: { accounts: Account[]; onImported: () => void; onAccountCreated: () => void }) {
  const [accountSelection, setAccountSelection] = createSignal<AccountSelection | undefined>(undefined)
  const [pending, setPending] = createSignal<PendingImport | undefined>(undefined)
  const [dateColumn, setDateColumn] = createSignal('')
  const [amountShape, setAmountShape] = createSignal<AmountMapping['shape']>('single')
  const [amountColumn, setAmountColumn] = createSignal('')
  const [debitColumn, setDebitColumn] = createSignal('')
  const [creditColumn, setCreditColumn] = createSignal('')
  const [descriptionColumn, setDescriptionColumn] = createSignal('')
  const [idColumn, setIdColumn] = createSignal('')
  const [dateFormat, setDateFormat] = createSignal<DateFormat>('MM/DD/YYYY')
  const [summary, setSummary] = createSignal<ImportSummary | undefined>(undefined)

  async function importRows(rows: Record<string, string>[], mapping: ColumnMapping) {
    const candidates = parseTransactionRows(rows, mapping)
    const repository = await transactionRepository
    const existing = (await repository.list()).filter((transaction) => transaction.accountId === mapping.accountId)
    const { newTransactions, newCount, duplicateCount } = deduplicateTransactions(candidates, existing)
    const rulesRepository = await ruleRepository
    const rules = await rulesRepository.list()
    await repository.createMany(applyRules(newTransactions, rules))
    setSummary({ newCount, duplicateCount })
    props.onImported()
  }

  async function handleFileSelected(event: Event & { currentTarget: HTMLInputElement }) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    const selection = accountSelection()
    if (!file || !selection) return

    const text = await file.text()
    const { headers, rows } = parseCsv(text)

    if (selection.kind === 'existing') {
      const repository = await columnMappingRepository
      const existing = await repository.get(selection.id)
      if (existing) {
        await importRows(rows, existing)
        return
      }
    }

    const guess = guessColumnMapping(headers)
    setDateColumn(guess.dateColumn ?? '')
    if (guess.amount.shape === 'debit-credit') {
      setAmountShape('debit-credit')
      setDebitColumn(guess.amount.debitColumn)
      setCreditColumn(guess.amount.creditColumn)
      setAmountColumn('')
    } else {
      setAmountShape('single')
      setAmountColumn(guess.amount.amountColumn ?? '')
      setDebitColumn('')
      setCreditColumn('')
    }
    setDescriptionColumn(guess.descriptionColumn ?? '')
    setIdColumn(NO_ID_COLUMN)
    setPending({ account: selection, headers, rows })
  }

  async function resolveAccountId(account: AccountSelection): Promise<string> {
    if (account.kind === 'existing') return account.id

    const repository = await accountRepository
    const created = await repository.create({ name: account.name })
    setAccountSelection({ kind: 'existing', id: created.id, name: created.name })
    props.onAccountCreated()
    return created.id
  }

  async function handleConfirmMapping(event: SubmitEvent) {
    event.preventDefault()
    const current = pending()
    if (!current || !dateColumn() || !descriptionColumn()) return

    const amount: AmountMapping =
      amountShape() === 'single'
        ? { shape: 'single', amountColumn: amountColumn() }
        : { shape: 'debit-credit', debitColumn: debitColumn(), creditColumn: creditColumn() }
    if (amount.shape === 'single' && !amount.amountColumn) return
    if (amount.shape === 'debit-credit' && (!amount.debitColumn || !amount.creditColumn)) return

    const accountId = await resolveAccountId(current.account)
    const mapping: ColumnMapping = {
      accountId,
      dateColumn: dateColumn(),
      amount,
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
        <AccountCombobox accounts={props.accounts} value={accountSelection()} onChange={setAccountSelection} />
      </label>
      <input
        type="file"
        accept=".csv"
        aria-label="CSV file"
        disabled={!accountSelection()}
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
              Amount shape
              <select
                value={amountShape()}
                onInput={(event) => setAmountShape(event.currentTarget.value as AmountMapping['shape'])}
              >
                <option value="single">Single signed amount column</option>
                <option value="debit-credit">Separate debit and credit columns</option>
              </select>
            </label>
            <Show
              when={amountShape() === 'single'}
              fallback={
                <>
                  <label>
                    Debit column
                    <select value={debitColumn()} onInput={(event) => setDebitColumn(event.currentTarget.value)}>
                      <option value="">Select a column</option>
                      <For each={current().headers}>{(header) => <option value={header}>{header}</option>}</For>
                    </select>
                  </label>
                  <label>
                    Credit column
                    <select value={creditColumn()} onInput={(event) => setCreditColumn(event.currentTarget.value)}>
                      <option value="">Select a column</option>
                      <For each={current().headers}>{(header) => <option value={header}>{header}</option>}</For>
                    </select>
                  </label>
                </>
              }
            >
              <label>
                Amount column
                <select value={amountColumn()} onInput={(event) => setAmountColumn(event.currentTarget.value)}>
                  <option value="">Select a column</option>
                  <For each={current().headers}>{(header) => <option value={header}>{header}</option>}</For>
                </select>
              </label>
            </Show>
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
            {current().newCount + current().duplicateCount} rows: {current().newCount} new,{' '}
            {current().duplicateCount} already seen.
          </p>
        )}
      </Show>
    </section>
  )
}
