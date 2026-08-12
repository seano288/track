/**
 * The transaction list: search, sort, and categorise.
 *
 * Period, account, and category come in as props — the Overview's filter row and
 * the donut own those, so they aren't duplicated here. What is local to the list
 * (the payee search, direction, sort order) still round-trips through the URL.
 *
 * Rows render in pages rather than all at once — a few years of statements is
 * tens of thousands of rows, and mounting them all would stall the page.
 */
import { For, Show, createMemo, createSignal } from "solid-js";
import { useApp } from "../store";
import { formatMoney } from "../lib/money";
import { formatDate } from "../lib/dates";
import { applyFilter, totals, type Period } from "../lib/summary";
import { suggestPattern } from "../lib/categories";
import { urlParam } from "../lib/url-state";

type SortKey = "date" | "amount" | "description";
const PAGE = 200;

export function TransactionList(props: {
  period: Period;
  accountIds?: string[];
  categoryIds?: string[];
}) {
  const { state, actions, accountName } = useApp();

  const [query, setQuery] = urlParam("q", "");
  const [direction, setDirection] = urlParam("dir", "all");
  const [sortKey, setSortKey] = urlParam("sort", "date");
  const [sortDir, setSortDir] = urlParam("asc", "");

  const [limit, setLimit] = createSignal(PAGE);
  const [makeRules, setMakeRules] = createSignal(true);
  const [selected, setSelected] = createSignal<Set<string>>(new Set<string>());
  const [bulkCategory, setBulkCategory] = createSignal("");

  const ascending = () => sortDir() === "1";

  const filtered = createMemo(() =>
    applyFilter(state.transactions, {
      period: props.period,
      accountIds: props.accountIds,
      categoryIds: props.categoryIds,
      direction: direction() as "all" | "out" | "in",
      query: query(),
    }),
  );

  const sorted = createMemo(() => {
    const key = sortKey() as SortKey;
    const factor = ascending() ? 1 : -1;
    return [...filtered()].sort((a, b) => {
      if (key === "amount") return (a.amountCents - b.amountCents) * factor;
      if (key === "description") return a.description.localeCompare(b.description) * factor;
      // Date ties fall back to amount so the order is stable between renders.
      if (a.date !== b.date) return (a.date < b.date ? -1 : 1) * factor;
      return (a.amountCents - b.amountCents) * factor;
    });
  });

  const visible = createMemo(() => sorted().slice(0, limit()));
  const summary = createMemo(() => totals(filtered(), state.categories));

  const toggleSort = (key: SortKey) => {
    if (sortKey() === key) setSortDir(ascending() ? "" : "1");
    else {
      setSortKey(key);
      setSortDir(key === "description" ? "1" : "");
    }
    setLimit(PAGE);
  };

  const sortMark = (key: SortKey) => (sortKey() !== key ? "" : ascending() ? " ↑" : " ↓");

  const toggleSelected = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const applyBulk = () => {
    const category = bulkCategory();
    if (!category || selected().size === 0) return;
    actions.setCategoryForMany([...selected()], category);
    setSelected(new Set<string>());
    setBulkCategory("");
  };

  return (
    <div>
      <div class="filters">
        <input
          class="search"
          type="search"
          placeholder="Search payee…"
          value={query()}
          onInput={(event) => {
            setQuery(event.currentTarget.value);
            setLimit(PAGE);
          }}
          aria-label="Search transactions"
        />
        <div class="chip-row" role="group" aria-label="Direction">
          <For
            each={
              [
                ["all", "All"],
                ["out", "Money out"],
                ["in", "Money in"],
              ] as const
            }
          >
            {([value, label]) => (
              <button
                class="chip"
                aria-pressed={direction() === value}
                onClick={() => setDirection(value)}
              >
                {label}
              </button>
            )}
          </For>
        </div>
        <span class="spacer" style={{ "font-size": "12.5px", color: "var(--text-secondary)" }}>
          <strong style={{ color: "var(--text-primary)" }}>{filtered().length}</strong>{" "}
          transaction{filtered().length === 1 ? "" : "s"} · {formatMoney(summary().outCents)} out
          · {formatMoney(summary().inCents)} in
        </span>
      </div>

      <div class="row" style={{ "font-size": "12.5px", "margin-bottom": "10px" }}>
        <label class="row" style={{ gap: "6px", cursor: "pointer", color: "var(--text-secondary)" }}>
          <input
            type="checkbox"
            checked={makeRules()}
            onChange={(event) => setMakeRules(event.currentTarget.checked)}
          />
          Remember my choice for similar payees
        </label>
      </div>

      <Show when={selected().size > 0}>
        <div class="notice">
          <div class="row">
            <span>{selected().size} selected</span>
            <select
              value={bulkCategory()}
              onChange={(event) => setBulkCategory(event.currentTarget.value)}
              aria-label="Category for selected transactions"
            >
              <option value="">Set category…</option>
              <For each={state.categories}>
                {(category) => <option value={category.id}>{category.name}</option>}
              </For>
            </select>
            <button class="btn btn-sm btn-primary" onClick={applyBulk} disabled={!bulkCategory()}>
              Apply
            </button>
            <button class="btn btn-sm" onClick={() => setSelected(new Set<string>())}>
              Clear
            </button>
          </div>
        </div>
      </Show>

      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th style={{ width: "28px" }}>
                <span class="visually-hidden">Select</span>
              </th>
              <th class="sortable" onClick={() => toggleSort("date")}>
                Date{sortMark("date")}
              </th>
              <th class="sortable" onClick={() => toggleSort("description")}>
                Payee{sortMark("description")}
              </th>
              <Show when={state.accounts.length > 1}>
                <th>Account</th>
              </Show>
              <th>Category</th>
              <th class="num sortable" onClick={() => toggleSort("amount")}>
                Amount{sortMark("amount")}
              </th>
            </tr>
          </thead>
          <tbody>
            <For each={visible()}>
              {(transaction) => (
                <tr>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected().has(transaction.id)}
                      onChange={() => toggleSelected(transaction.id)}
                      aria-label={`Select ${transaction.description}`}
                    />
                  </td>
                  <td class="num" style={{ "text-align": "left" }}>
                    {formatDate(transaction.date)}
                  </td>
                  <td class="desc" title={transaction.description}>
                    {transaction.description}
                    <Show when={transaction.categorySource === "manual"}>
                      {" "}
                      <span class="pill">edited</span>
                    </Show>
                  </td>
                  <Show when={state.accounts.length > 1}>
                    <td class="muted">{accountName(transaction.accountId)}</td>
                  </Show>
                  <td>
                    <select
                      value={transaction.categoryId}
                      onChange={(event) =>
                        actions.setCategory(transaction.id, event.currentTarget.value, makeRules())
                      }
                      aria-label={`Category for ${transaction.description}`}
                      title={
                        makeRules()
                          ? `Also applies to payees matching “${suggestPattern(transaction.description)}”`
                          : undefined
                      }
                    >
                      <For each={state.categories}>
                        {(category) => <option value={category.id}>{category.name}</option>}
                      </For>
                    </select>
                  </td>
                  <td
                    class="num"
                    style={{
                      color: transaction.amountCents > 0 ? "var(--good)" : "var(--text-primary)",
                    }}
                  >
                    {formatMoney(transaction.amountCents)}
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>

      <Show when={filtered().length === 0}>
        <p class="muted" style={{ padding: "24px", "text-align": "center" }}>
          Nothing matches those filters.
        </p>
      </Show>

      <Show when={sorted().length > limit()}>
        <div style={{ padding: "12px", "text-align": "center" }}>
          <button class="btn" onClick={() => setLimit((v) => v + PAGE)}>
            Show {Math.min(PAGE, sorted().length - limit())} more of{" "}
            {sorted().length - limit()} remaining
          </button>
        </div>
      </Show>
    </div>
  );
}
