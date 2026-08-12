/**
 * Import: drop CSVs, check how they were read, then commit.
 *
 * Nothing is saved until you press Import. The detected mapping is shown as
 * editable controls next to a live preview of the first rows, so a
 * misidentified column is visible before it becomes data rather than after.
 */
import { For, Show, createMemo, createSignal } from "solid-js";
import { useApp, type ImportOutcome } from "../store";
import { accountNameFromFilename, buildTransactions, parseFile } from "../lib/import-map";
import { formatMoney } from "../lib/money";
import { formatDate } from "../lib/dates";
import type { Account, ColumnMapping } from "../lib/types";

interface Staged {
  key: string;
  filename: string;
  header: string[];
  dataRows: string[][];
  mapping: ColumnMapping;
  warnings: string[];
  accountChoice: string;
  accountName: string;
  accountKind: Account["kind"];
}

export function ImportPanel(props: { onImported: () => void }) {
  const { state, actions } = useApp();
  const [staged, setStaged] = createSignal<Staged[]>([]);
  const [over, setOver] = createSignal(false);
  const [outcomes, setOutcomes] = createSignal<ImportOutcome[]>([]);
  const [errors, setErrors] = createSignal<string[]>([]);

  let counter = 0;

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    const next: Staged[] = [];
    const failures: string[] = [];

    for (const file of Array.from(files)) {
      if (!/\.(csv|txt|tsv)$/i.test(file.name)) {
        failures.push(`${file.name} isn't a CSV file.`);
        continue;
      }
      let text: string;
      try {
        text = await file.text();
      } catch {
        failures.push(`Couldn't read ${file.name}.`);
        continue;
      }
      const parsed = parseFile(text);
      if (parsed.dataRows.length === 0) {
        failures.push(`${file.name} has no transaction rows.`);
        continue;
      }
      const suggestedName = accountNameFromFilename(file.name);
      // Reuse an existing account when the name matches, so a monthly export
      // lands in the same place rather than creating a duplicate account.
      const existing = state.accounts.find(
        (a) => a.name.toLowerCase() === suggestedName.toLowerCase(),
      );
      next.push({
        key: `f${counter++}`,
        filename: file.name,
        header: parsed.header,
        dataRows: parsed.dataRows,
        // An account remembers its mapping; prefer it over fresh detection.
        mapping: existing?.mapping ?? parsed.mapping,
        warnings: existing?.mapping ? [] : parsed.warnings,
        accountChoice: existing?.id ?? "new",
        accountName: suggestedName,
        accountKind: guessKind(parsed.header),
      });
    }

    setErrors(failures);
    setStaged((current) => [...current, ...next]);
  };

  const update = (key: string, patch: Partial<Staged>) =>
    setStaged((current) => current.map((s) => (s.key === key ? { ...s, ...patch } : s)));

  const patchMapping = (key: string, patch: Partial<ColumnMapping>) =>
    setStaged((current) =>
      current.map((s) => (s.key === key ? { ...s, mapping: { ...s.mapping, ...patch } } : s)),
    );

  const importOne = (item: Staged) => {
    const outcome = actions.importRows({
      dataRows: item.dataRows,
      mapping: item.mapping,
      accountId: item.accountChoice === "new" ? undefined : item.accountChoice,
      accountName: item.accountName,
      accountKind: item.accountKind,
    });
    setOutcomes((current) => [...current, outcome]);
    setStaged((current) => current.filter((s) => s.key !== item.key));
    props.onImported();
  };

  const importAll = () => {
    for (const item of staged()) importOne(item);
  };

  return (
    <div class="stack">
      <div
        class={`dropzone ${over() ? "over" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          void addFiles(event.dataTransfer?.files ?? null);
        }}
      >
        <p><strong>Drop CSV exports here</strong></p>
        <p class="muted" style={{ "font-size": "12.5px" }}>
          Download a transaction export from your bank or card, then drop it in. Several
          files at once is fine.
        </p>
        <label class="btn" style={{ display: "inline-block", "margin-top": "10px" }}>
          Choose files
          <input
            type="file"
            accept=".csv,.txt,.tsv,text/csv"
            multiple
            class="visually-hidden"
            onChange={(event) => {
              void addFiles(event.currentTarget.files);
              event.currentTarget.value = "";
            }}
          />
        </label>
      </div>

      <Show when={errors().length > 0}>
        <div class="notice error">
          <For each={errors()}>{(error) => <div>{error}</div>}</For>
        </div>
      </Show>

      <Show when={outcomes().length > 0}>
        <div class="card">
          <div class="card-head">
            <h2>Imported</h2>
            <button class="btn btn-sm" onClick={() => setOutcomes([])}>
              Dismiss
            </button>
          </div>
          <For each={outcomes()}>
            {(outcome) => (
              <div style={{ "margin-bottom": "8px" }}>
                <strong>{outcome.accountName}</strong>: {outcome.added} added
                <Show when={outcome.duplicates > 0}>
                  , {outcome.duplicates} already imported
                </Show>
                <Show when={outcome.skipped.length > 0}>
                  , {outcome.skipped.length} skipped
                </Show>
                <Show when={outcome.uncategorized > 0}>
                  {" "}
                  · {outcome.uncategorized} need a category
                </Show>
                <Show when={outcome.skipped.length > 0}>
                  <div class="notice" style={{ "margin-top": "6px" }}>
                    Skipped rows:
                    <ul>
                      <For each={outcome.skipped.slice(0, 5)}>
                        {(skip) => (
                          <li>
                            {skip.reason} — <span class="muted">{skip.row.join(" | ").slice(0, 90)}</span>
                          </li>
                        )}
                      </For>
                    </ul>
                  </div>
                </Show>
              </div>
            )}
          </For>
        </div>
      </Show>

      <Show when={staged().length > 1}>
        <div class="row">
          <button class="btn btn-primary" onClick={importAll}>
            Import all {staged().length} files
          </button>
          <button class="btn" onClick={() => setStaged([])}>
            Discard all
          </button>
        </div>
      </Show>

      <For each={staged()}>
        {(item) => (
          <StagedFile
            item={item}
            accounts={state.accounts}
            onUpdate={(patch) => update(item.key, patch)}
            onPatchMapping={(patch) => patchMapping(item.key, patch)}
            onImport={() => importOne(item)}
            onDiscard={() => setStaged((current) => current.filter((s) => s.key !== item.key))}
          />
        )}
      </For>
    </div>
  );
}

function StagedFile(props: {
  item: Staged;
  accounts: Account[];
  onUpdate: (patch: Partial<Staged>) => void;
  onPatchMapping: (patch: Partial<ColumnMapping>) => void;
  onImport: () => void;
  onDiscard: () => void;
}) {
  const amountMode = createMemo<"pair" | "single">(() =>
    props.item.mapping.amount != null ? "single" : "pair",
  );

  const preview = createMemo(() =>
    buildTransactions(props.item.dataRows.slice(0, 6), props.item.mapping, "preview"),
  );

  const allRows = createMemo(() =>
    buildTransactions(props.item.dataRows, props.item.mapping, "preview"),
  );

  const columnOptions = createMemo(() =>
    props.item.header.map((label, index) => ({ label: label || `Column ${index + 1}`, index })),
  );

  const ColumnSelect = (p: {
    label: string;
    value: number | undefined;
    optional?: boolean;
    onChange: (value: number | undefined) => void;
  }) => (
    <div class="field">
      <label>{p.label}</label>
      <select
        value={p.value ?? ""}
        onChange={(event) => {
          const raw = event.currentTarget.value;
          p.onChange(raw === "" ? undefined : Number(raw));
        }}
      >
        <Show when={p.optional}>
          <option value="">— none —</option>
        </Show>
        <For each={columnOptions()}>
          {(option) => <option value={option.index}>{option.label}</option>}
        </For>
      </select>
    </div>
  );

  return (
    <div class="card">
      <div class="card-head">
        <h2>{props.item.filename}</h2>
        <span class="muted" style={{ "font-size": "12px" }}>
          {props.item.dataRows.length} rows
        </span>
      </div>

      <Show when={props.item.warnings.length > 0}>
        <div class="notice">
          <For each={props.item.warnings}>{(warning) => <div>{warning}</div>}</For>
        </div>
      </Show>

      <div class="map-grid">
        <div class="field">
          <label>Account</label>
          <select
            value={props.item.accountChoice}
            onChange={(event) => props.onUpdate({ accountChoice: event.currentTarget.value })}
          >
            <option value="new">New account…</option>
            <For each={props.accounts}>
              {(account) => <option value={account.id}>{account.name}</option>}
            </For>
          </select>
        </div>
        <Show when={props.item.accountChoice === "new"}>
          <div class="field">
            <label>Account name</label>
            <input
              type="text"
              value={props.item.accountName}
              onInput={(event) => props.onUpdate({ accountName: event.currentTarget.value })}
            />
          </div>
          <div class="field">
            <label>Account type</label>
            <select
              value={props.item.accountKind}
              onChange={(event) =>
                props.onUpdate({ accountKind: event.currentTarget.value as Account["kind"] })
              }
            >
              <option value="credit">Credit card</option>
              <option value="bank">Bank account</option>
            </select>
          </div>
        </Show>

        <ColumnSelect
          label="Date column"
          value={props.item.mapping.date}
          onChange={(value) => props.onPatchMapping({ date: value ?? 0 })}
        />
        <ColumnSelect
          label="Payee column"
          value={props.item.mapping.description}
          onChange={(value) => props.onPatchMapping({ description: value ?? 0 })}
        />

        <div class="field">
          <label>Amount format</label>
          <select
            value={amountMode()}
            onChange={(event) => {
              if (event.currentTarget.value === "single") {
                props.onPatchMapping({
                  amount: props.item.mapping.debit ?? 0,
                  debit: undefined,
                  credit: undefined,
                });
              } else {
                props.onPatchMapping({
                  debit: props.item.mapping.amount ?? 0,
                  credit: undefined,
                  amount: undefined,
                });
              }
            }}
          >
            <option value="pair">Separate money-out / money-in columns</option>
            <option value="single">One column with +/− amounts</option>
          </select>
        </div>

        <Show when={amountMode() === "pair"}>
          <ColumnSelect
            label="Money out (debit)"
            value={props.item.mapping.debit}
            optional
            onChange={(value) => props.onPatchMapping({ debit: value })}
          />
          <ColumnSelect
            label="Money in (credit)"
            value={props.item.mapping.credit}
            optional
            onChange={(value) => props.onPatchMapping({ credit: value })}
          />
        </Show>

        <Show when={amountMode() === "single"}>
          <ColumnSelect
            label="Amount column"
            value={props.item.mapping.amount}
            onChange={(value) => props.onPatchMapping({ amount: value })}
          />
          <div class="field">
            <label>Which sign means money out?</label>
            <select
              value={props.item.mapping.amountSign ?? "negative-is-outflow"}
              onChange={(event) =>
                props.onPatchMapping({
                  amountSign: event.currentTarget.value as ColumnMapping["amountSign"],
                })
              }
            >
              <option value="negative-is-outflow">Negative is money out</option>
              <option value="positive-is-outflow">Positive is money out</option>
            </select>
          </div>
        </Show>

        <ColumnSelect
          label="Bank's category (optional)"
          value={props.item.mapping.category}
          optional
          onChange={(value) => props.onPatchMapping({ category: value })}
        />

        <div class="field">
          <label>Date order</label>
          <select
            value={props.item.mapping.dayFirst ? "day" : "month"}
            onChange={(event) =>
              props.onPatchMapping({ dayFirst: event.currentTarget.value === "day" })
            }
          >
            <option value="month">Month first (US: 08/03 = 3 Aug)</option>
            <option value="day">Day first (08/03 = 8 Mar)</option>
          </select>
        </div>
      </div>

      <h3 style={{ "margin-bottom": "8px" }}>Preview</h3>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Payee</th>
              <th class="num">Amount</th>
              <Show when={props.item.mapping.category != null}>
                <th>Bank category</th>
              </Show>
            </tr>
          </thead>
          <tbody>
            <For each={preview().transactions}>
              {(transaction) => (
                <tr>
                  <td>{formatDate(transaction.date)}</td>
                  <td class="desc">{transaction.description}</td>
                  <td
                    class="num"
                    style={{
                      color:
                        transaction.amountCents > 0 ? "var(--good)" : "var(--text-primary)",
                    }}
                  >
                    {formatMoney(transaction.amountCents)}
                  </td>
                  <Show when={props.item.mapping.category != null}>
                    <td class="muted">{transaction.bankCategory ?? "—"}</td>
                  </Show>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>

      <Show when={preview().skipped.length > 0}>
        <div class="notice error" style={{ "margin-top": "12px" }}>
          The first rows couldn't be read ({preview().skipped[0]!.reason}). Check the column
          choices above.
        </div>
      </Show>

      <div class="row" style={{ "margin-top": "16px" }}>
        <button class="btn btn-primary" onClick={props.onImport}>
          Import {allRows().transactions.length} transactions
        </button>
        <button class="btn" onClick={props.onDiscard}>
          Discard
        </button>
        <Show when={allRows().skipped.length > 0}>
          <span class="pill warn">
            {allRows().skipped.length} row
            {allRows().skipped.length === 1 ? "" : "s"} will be skipped
          </span>
        </Show>
      </div>
    </div>
  );
}

/** A file with a running balance is almost always a bank account, not a card. */
function guessKind(header: string[]): Account["kind"] {
  const joined = header.join(" ").toLowerCase();
  return /balance|withdrawal|deposit|check/.test(joined) ? "bank" : "credit";
}
