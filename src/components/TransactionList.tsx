/**
 * The transaction list: search, sort, categorise, and inspect.
 *
 * Period, account, and category come in as props — the Overview's filter row and
 * the donut own those, so they aren't duplicated here. What is local to the list
 * (the search, direction, sort order, whether transfers show) still round-trips
 * through the URL.
 *
 * Rows render in pages rather than all at once — a few years of statements is
 * tens of thousands of rows, and mounting them all would stall the page.
 */
import { For, Show, createMemo, createSignal, type JSX } from "solid-js";
import { useApp } from "../store";
import { HIDDEN } from "../lib/categories";
import { formatMoney } from "../lib/money";
import { addMonths, formatDate, formatMonth, monthOf } from "../lib/dates";
import { applyFilter, type Period } from "../lib/summary";
import { urlParam } from "../lib/url-state";
import type { CategoryGroup, Transaction } from "../lib/types";

type SortKey = "date" | "amount" | "description";
const PAGE = 200;

/**
 * What a list of spending leaves out by default.
 *
 * Transfers are the same money twice — a card payment and the purchases it
 * settles — so they pad the list without adding anything to read, and hidden rows
 * were put there deliberately. Both are one toggle away rather than gone.
 */
const SET_ASIDE: CategoryGroup[] = ["transfer", "hidden"];

/** Ask Google about a payee — the fastest way to identify a cryptic one. */
function searchTheWeb(description: string) {
  const url = `https://www.google.com/search?q=${encodeURIComponent(description)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

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
  const [showAside, setShowAside] = urlParam("aside", "");

  const [limit, setLimit] = createSignal(PAGE);
  const [selected, setSelected] = createSignal<Set<string>>(new Set<string>());
  const [bulkCategory, setBulkCategory] = createSignal("");
  /** One row's details at a time — the table stays legible that way. */
  const [expanded, setExpanded] = createSignal("");

  const ascending = () => sortDir() === "1";
  const showingAside = () => showAside() === "1";

  /** Everything except the transfer/hidden decision, which is the toggle's job. */
  const baseFilter = () => ({
    period: props.period,
    accountIds: props.accountIds,
    categoryIds: props.categoryIds,
    direction: direction() as "all" | "out" | "in",
    query: query(),
    // Search reads the labels the row displays, not just the payee.
    categories: state.categories,
    accounts: state.accounts,
  });

  const filtered = createMemo(() =>
    applyFilter(state.transactions, {
      ...baseFilter(),
      excludeGroups: showingAside() ? undefined : SET_ASIDE,
    }),
  );

  /**
   * How many rows the default view is holding back. Shown next to the count so
   * the list never quietly disagrees with the total above it.
   */
  const asideCount = createMemo(() =>
    showingAside() ? 0 : applyFilter(state.transactions, baseFilter()).length - filtered().length,
  );

  /** Which category is which kind, for the pill that explains an unusual row. */
  const groupOf = createMemo(() => new Map(state.categories.map((c) => [c.id, c.group])));

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

  /** Columns the details row has to span, which depends on the account column. */
  const columnCount = createMemo(() => (state.accounts.length > 1 ? 6 : 5));

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
          placeholder="Search…"
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
        {/* Without the rule this toggle reads as a fourth direction, and it isn't
            one — the three above are exclusive, this one is independent. */}
        <span class="divider" aria-hidden="true" />
        <div class="chip-row">
          {/* Off by default: transfers and hidden rows are money you've already
              accounted for, or chosen to ignore. */}
          <button
            class="chip"
            aria-pressed={showingAside()}
            onClick={() => setShowAside(showingAside() ? "" : "1")}
          >
            Transfers &amp; hidden
          </button>
        </div>
        <span class="spacer" style={{ "font-size": "12.5px", color: "var(--text-secondary)" }}>
          <strong style={{ color: "var(--text-primary)" }}>{filtered().length}</strong>{" "}
          transaction{filtered().length === 1 ? "" : "s"}
          <Show when={asideCount() > 0}> · {asideCount()} set aside</Show>
        </span>
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
                <>
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
                    <td class="desc">
                      {/* The payee is the handle for the whole record: one click
                          opens what the bank actually sent. */}
                      <button
                        class="payee"
                        title={transaction.description}
                        aria-expanded={expanded() === transaction.id}
                        onClick={() =>
                          setExpanded(expanded() === transaction.id ? "" : transaction.id)
                        }
                      >
                        {transaction.description}
                      </button>
                      <Show when={transaction.categorySource === "manual"}>
                        {" "}
                        <span class="pill">edited</span>
                      </Show>
                      <Show when={transaction.originalDate}>
                        {" "}
                        <span class="pill">moved</span>
                      </Show>
                      {/* Only ever on screen with the toggle on, so it says why. */}
                      <Show when={groupOf().get(transaction.categoryId) === "hidden"}>
                        {" "}
                        <span class="pill">hidden</span>
                      </Show>
                    </td>
                    <Show when={state.accounts.length > 1}>
                      <td class="muted">{accountName(transaction.accountId)}</td>
                    </Show>
                    <td>
                      <select
                        value={transaction.categoryId}
                        onChange={(event) =>
                          actions.setCategory(transaction.id, event.currentTarget.value)
                        }
                        aria-label={`Category for ${transaction.description}`}
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
                  <Show when={expanded() === transaction.id}>
                    <Details transaction={transaction} columns={columnCount()} />
                  </Show>
                </>
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

/**
 * The row behind a row: the record as stored and the CSV line it came from,
 * plus the two things you might want to do with one transaction.
 *
 * Nudging the date exists because banks post a charge when they get round to it:
 * a payment due on the 1st lands on the 31st when the 1st is a weekend, and it
 * belongs to the month it was meant for. The imported date is kept, so the
 * nudge is always reversible and the raw view still shows what the bank said.
 */
function Details(props: { transaction: Transaction; columns: number }) {
  const { state, actions, accountName } = useApp();
  const row = () => props.transaction;

  const monthLabel = (delta: 1 | -1) => formatMonth(addMonths(monthOf(row().date), delta));
  const categoryName = () =>
    state.categories.find((c) => c.id === row().categoryId)?.name ?? row().categoryId;

  return (
    <tr class="detail-row">
      <td colSpan={props.columns}>
        <div class="detail">
          <div class="row">
            <span class="muted">Move to</span>
            <button
              class="btn btn-sm"
              onClick={() => actions.shiftMonth(row().id, -1)}
              aria-label={`Move to ${monthLabel(-1)}`}
            >
              ← {monthLabel(-1)}
            </button>
            <button
              class="btn btn-sm"
              onClick={() => actions.shiftMonth(row().id, 1)}
              aria-label={`Move to ${monthLabel(1)}`}
            >
              {monthLabel(1)} →
            </button>
            <Show when={row().originalDate}>
              <button class="btn btn-sm" onClick={() => actions.restoreDate(row().id)}>
                Restore {formatDate(row().originalDate!)}
              </button>
            </Show>
            {/* Hiding is a category, so undoing it is the Category column — no
                second mechanism to keep in step with the first. */}
            <Show
              when={row().categoryId !== HIDDEN}
              fallback={<span class="muted">Hidden from reports</span>}
            >
              <button class="btn btn-sm" onClick={() => actions.setCategory(row().id, HIDDEN)}>
                Hide from reports
              </button>
            </Show>
            <button
              class="btn btn-sm spacer"
              onClick={() => searchTheWeb(row().description)}
            >
              Search Google ↗
            </button>
          </div>

          <dl class="raw">
            <Field label="Date">
              {row().date}
              <Show when={row().originalDate}>
                {" "}
                <span class="muted">imported as {row().originalDate}</span>
              </Show>
            </Field>
            <Field label="Payee">{row().description}</Field>
            <Field label="Amount">
              {formatMoney(row().amountCents)}{" "}
              <span class="muted">{row().amountCents} cents</span>
            </Field>
            <Field label="Account">{accountName(row().accountId)}</Field>
            <Field label="Category">
              {categoryName()} <span class="muted">by {row().categorySource}</span>
            </Field>
            <Show when={row().bankCategory}>
              <Field label="Bank category">{row().bankCategory}</Field>
            </Show>
            <Field label="ID">{row().id}</Field>
          </dl>

          <Show
            when={row().raw}
            fallback={
              <p class="muted raw-note">Imported before original rows were kept.</p>
            }
          >
            {/* The CSV line as it arrived, cells separated so empty ones show. */}
            <pre class="raw-row">{row().raw!.join("  │  ")}</pre>
          </Show>
        </div>
      </td>
    </tr>
  );
}

function Field(props: { label: string; children: JSX.Element }) {
  return (
    <div>
      <dt>{props.label}</dt>
      <dd>{props.children}</dd>
    </div>
  );
}
