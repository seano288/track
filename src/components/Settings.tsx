/**
 * Accounts, categorisation rules, and backup.
 *
 * Backup matters more here than in a server-backed app: the data lives only in
 * this browser, so clearing site data or switching machines loses it. Export
 * writes a plain JSON file that Import restores.
 */
import { For, Show, createMemo, createSignal } from "solid-js";
import { useApp } from "../store";
import { formatDate } from "../lib/dates";

export function Settings() {
  const { state, actions } = useApp();
  const [message, setMessage] = createSignal<string>();
  const [error, setError] = createSignal<string>();
  const [confirmingClear, setConfirmingClear] = createSignal(false);
  const [newPattern, setNewPattern] = createSignal("");
  const [newCategory, setNewCategory] = createSignal("groceries");

  const userRules = createMemo(() => state.rules.filter((r) => r.createdAt !== "seed"));
  const seedCount = createMemo(() => state.rules.length - userRules().length);

  const countFor = (accountId: string) =>
    state.transactions.filter((t) => t.accountId === accountId).length;

  const download = () => {
    const blob = new Blob([actions.exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `track-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Backup downloaded.");
  };

  const restore = async (file: File | undefined) => {
    if (!file) return;
    setError(undefined);
    setMessage(undefined);
    const result = actions.importJson(await file.text());
    if (result.ok) setMessage("Backup restored.");
    else setError(result.error);
  };

  return (
    <div class="stack">
      <div class="card">
        <div class="card-head">
          <h2>Accounts</h2>
        </div>
        <p class="card-sub">
          An account is created the first time you import a file for it. Deleting one also
          deletes its transactions.
        </p>
        <Show
          when={state.accounts.length > 0}
          fallback={<p class="muted">No accounts yet — import a CSV to create one.</p>}
        >
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th class="num">Transactions</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                <For each={state.accounts}>
                  {(account) => (
                    <tr>
                      <td>
                        <input
                          type="text"
                          value={account.name}
                          onChange={(event) =>
                            actions.renameAccount(account.id, event.currentTarget.value)
                          }
                          aria-label={`Name of ${account.name}`}
                        />
                      </td>
                      <td class="muted">
                        {account.kind === "bank" ? "Bank account" : "Credit card"}
                      </td>
                      <td class="num">{countFor(account.id)}</td>
                      <td class="num">
                        <button
                          class="btn btn-sm btn-danger"
                          onClick={() => {
                            if (
                              confirm(
                                `Delete ${account.name} and its ${countFor(account.id)} transactions? This can't be undone.`,
                              )
                            ) {
                              actions.deleteAccount(account.id);
                            }
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </Show>
      </div>

      <div class="card">
        <div class="card-head">
          <h2>Categorisation rules</h2>
          <button class="btn btn-sm" onClick={() => actions.reapplyRules()}>
            Re-run on all transactions
          </button>
        </div>
        <p class="card-sub">
          A rule matches a payee by substring. Yours are checked before the {seedCount()}{" "}
          built-in ones, and neither overrides a category you set by hand.
        </p>

        <div class="row" style={{ "margin-bottom": "12px" }}>
          <input
            type="text"
            placeholder="Payee contains…"
            value={newPattern()}
            onInput={(event) => setNewPattern(event.currentTarget.value)}
            aria-label="Payee pattern"
          />
          <select
            value={newCategory()}
            onChange={(event) => setNewCategory(event.currentTarget.value)}
            aria-label="Category for rule"
          >
            <For each={state.categories}>
              {(category) => <option value={category.id}>{category.name}</option>}
            </For>
          </select>
          <button
            class="btn btn-primary"
            disabled={!newPattern().trim()}
            onClick={() => {
              actions.addRule(newPattern(), newCategory());
              setNewPattern("");
            }}
          >
            Add rule
          </button>
        </div>

        <Show
          when={userRules().length > 0}
          fallback={
            <p class="muted">
              No rules of your own yet. Changing a category in the transaction list adds one
              automatically.
            </p>
          }
        >
          <div class="rule-list">
            <For each={userRules()}>
              {(rule) => (
                <span class="rule">
                  <span>
                    <strong>{rule.pattern}</strong>
                    <span class="muted">
                      {" → "}
                      {state.categories.find((c) => c.id === rule.categoryId)?.name ?? rule.categoryId}
                    </span>
                  </span>
                  <button
                    onClick={() => actions.deleteRule(rule.id)}
                    aria-label={`Delete rule for ${rule.pattern}`}
                    title="Delete rule"
                  >
                    ×
                  </button>
                </span>
              )}
            </For>
          </div>
        </Show>
      </div>

      <div class="card">
        <div class="card-head">
          <h2>Your data</h2>
        </div>
        <p class="card-sub">
          Everything is stored in this browser only — nothing is uploaded anywhere. Clearing
          site data or using another browser means starting over, so keep a backup.
        </p>

        <Show when={message()}>
          <div class="notice">{message()}</div>
        </Show>
        <Show when={error()}>
          <div class="notice error">{error()}</div>
        </Show>

        <div class="row">
          <button class="btn" onClick={download} disabled={state.transactions.length === 0}>
            Export backup (JSON)
          </button>
          <label class="btn">
            Restore backup
            <input
              type="file"
              accept="application/json,.json"
              class="visually-hidden"
              onChange={(event) => {
                void restore(event.currentTarget.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
          </label>
          <Show
            when={confirmingClear()}
            fallback={
              <button
                class="btn btn-danger spacer"
                onClick={() => setConfirmingClear(true)}
                disabled={state.transactions.length === 0 && state.accounts.length === 0}
              >
                Delete everything
              </button>
            }
          >
            <span class="spacer row">
              <span>Delete all {state.transactions.length} transactions and accounts?</span>
              <button
                class="btn btn-sm btn-danger"
                onClick={() => {
                  actions.clearAll();
                  setConfirmingClear(false);
                  setMessage("All data deleted.");
                }}
              >
                Yes, delete
              </button>
              <button class="btn btn-sm" onClick={() => setConfirmingClear(false)}>
                Cancel
              </button>
            </span>
          </Show>
        </div>

        <Show when={state.transactions.length > 0}>
          <p class="muted" style={{ "font-size": "12px", "margin-bottom": "0" }}>
            {state.transactions.length} transactions across {state.accounts.length} account
            {state.accounts.length === 1 ? "" : "s"}
            {(() => {
              const dates = state.transactions.map((t) => t.date).sort();
              return dates.length > 0
                ? `, ${formatDate(dates[0]!)} to ${formatDate(dates[dates.length - 1]!)}`
                : "";
            })()}
            .
          </p>
        </Show>
      </div>
    </div>
  );
}
