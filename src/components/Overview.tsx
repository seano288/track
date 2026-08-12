/**
 * The Overview — the whole app, really.
 *
 * One filter row at the top scopes everything below it: the donut and its
 * headline figures, the monthly chart, and the transaction list at the bottom.
 * Picking a wedge or a category row narrows the list too, and every part of that
 * state lives in the URL, so any view can be linked to or reloaded.
 */
import { For, Match, Show, Switch, createMemo } from "solid-js";
import { useApp } from "../store";
import { formatMoney } from "../lib/money";
import { addDays, formatDate } from "../lib/dates";
import {
  CUSTOM_PERIOD_ID,
  OTHER_SLICE_ID,
  applyFilter,
  byMonth,
  categoryByMonth,
  foldCategories,
  periodPresets,
  resolvePeriod,
  spendingByCategory,
  totals,
} from "../lib/summary";
import { urlParam } from "../lib/url-state";
import {
  CategoryTable,
  CategoryTrend,
  MonthTable,
  MonthlyFlowChart,
  SpendingDonut,
} from "./Charts";
import { TransactionList } from "./TransactionList";

export function Overview() {
  const { state, latest } = useApp();

  const [periodId, setPeriodId] = urlParam("period", "this-month");
  const [customStart, setCustomStart] = urlParam("from", "");
  const [customEnd, setCustomEnd] = urlParam("to", "");
  const [accountId, setAccountId] = urlParam("account", "all");
  const [selected, setSelected] = urlParam("category", "");
  // Which chart the card is showing, and whether it's showing its table twin.
  const [view, setView] = urlParam("view", "pie");
  const [tableParam, setTableParam] = urlParam("table", "");
  const showTable = () => tableParam() === "1";

  const presets = createMemo(() => periodPresets(latest()));
  const period = createMemo(() =>
    resolvePeriod(periodId(), presets(), { start: customStart(), end: customEnd() }),
  );

  const filter = createMemo(() => ({
    period: period(),
    accountIds: accountId() === "all" ? undefined : [accountId()],
  }));

  const rows = createMemo(() => applyFilter(state.transactions, filter()));
  const summary = createMemo(() => totals(rows(), state.categories));
  const categoryTotals = createMemo(() => spendingByCategory(rows(), state.categories));
  const slices = createMemo(() => foldCategories(categoryTotals()));
  const months = createMemo(() => byMonth(rows(), state.categories));

  /**
   * The same span immediately before this one, for the headline delta. Skipped
   * for "all time", which has nothing before it to compare against.
   */
  const previous = createMemo(() => {
    if (periodId() === "all") return undefined;
    const spanDays = Math.round(
      (Date.parse(`${period().end}T00:00:00Z`) - Date.parse(`${period().start}T00:00:00Z`)) /
        86_400_000,
    );
    const prevEnd = addDays(period().start, -1);
    const prevRows = applyFilter(state.transactions, {
      ...filter(),
      period: { start: addDays(prevEnd, -spanDays), end: prevEnd },
    });
    if (prevRows.length === 0) return undefined;
    return totals(prevRows, state.categories);
  });

  const spendDelta = createMemo(() => {
    const before = previous()?.outCents;
    if (!before) return undefined;
    return (summary().outCents - before) / before;
  });

  /** "Other" stands for several categories, so a click on it filters to all of them. */
  const selectedIds = createMemo(() => {
    const id = selected();
    if (!id) return undefined;
    if (id === OTHER_SLICE_ID) {
      return slices().find((s) => s.categoryId === OTHER_SLICE_ID)?.members ?? [];
    }
    return [id];
  });

  const selectedName = createMemo(() => {
    const id = selected();
    if (!id) return "";
    if (id === OTHER_SLICE_ID) return "Other";
    return state.categories.find((c) => c.id === id)?.name ?? "";
  });

  const trend = createMemo(() => {
    const id = selected();
    if (!id || id === OTHER_SLICE_ID) return undefined;
    return categoryByMonth(rows(), id);
  });

  const uncategorizedCount = createMemo(
    () => rows().filter((t) => t.categoryId === "uncategorized").length,
  );

  const toggleCategory = (categoryId: string) =>
    setSelected(selected() === categoryId ? "" : categoryId);

  const showUncategorized = () => {
    setSelected("uncategorized");
    document.getElementById("transactions")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div class="stack">
      <div class="filters">
        <div class="chip-row" role="group" aria-label="Time period">
          <For each={presets()}>
            {(preset) => (
              <button
                class="chip"
                aria-pressed={periodId() === preset.id}
                onClick={() => setPeriodId(preset.id)}
              >
                {preset.label}
              </button>
            )}
          </For>
          <button
            class="chip"
            aria-pressed={periodId() === CUSTOM_PERIOD_ID}
            onClick={() => setPeriodId(CUSTOM_PERIOD_ID)}
          >
            Custom
          </button>
        </div>

        <Show when={periodId() === CUSTOM_PERIOD_ID}>
          <div class="row" style={{ gap: "6px" }}>
            <input
              type="date"
              value={customStart()}
              max={customEnd() || undefined}
              onChange={(event) => setCustomStart(event.currentTarget.value)}
              aria-label="From date"
            />
            <span class="muted">to</span>
            <input
              type="date"
              value={customEnd()}
              min={customStart() || undefined}
              onChange={(event) => setCustomEnd(event.currentTarget.value)}
              aria-label="To date"
            />
          </div>
        </Show>

        <Show when={state.accounts.length > 1}>
          <select
            value={accountId()}
            onChange={(event) => setAccountId(event.currentTarget.value)}
            aria-label="Account"
          >
            <option value="all">All accounts</option>
            <For each={state.accounts}>
              {(account) => <option value={account.id}>{account.name}</option>}
            </For>
          </select>
        </Show>

        <span class="muted spacer" style={{ "font-size": "12px" }}>
          <Show when={periodId() !== "all"} fallback={`${rows().length} transactions`}>
            {formatDate(period().start)} – {formatDate(period().end)}
          </Show>
        </span>
      </div>

      <Show when={uncategorizedCount() > 0}>
        <div class="notice">
          {uncategorizedCount()} transaction{uncategorizedCount() === 1 ? "" : "s"} in this
          period {uncategorizedCount() === 1 ? "isn't" : "aren't"} categorised yet, so they
          sit under Uncategorized.{" "}
          <button class="btn btn-sm" style={{ "margin-left": "4px" }} onClick={showUncategorized}>
            Categorise them
          </button>
        </div>
      </Show>

      {/* One card, two views: the donut by default, the monthly flow behind a
          toggle, and either one's table twin behind the same Table button. */}
      <div class="card">
        <div class="card-head">
          <h2>{view() === "months" ? "Money in and out by month" : "Where the money went"}</h2>
          <Show when={selected()}>
            <button class="btn btn-sm" onClick={() => setSelected("")}>
              Clear {selectedName()}
            </button>
          </Show>
          <div class="chip-row" role="group" aria-label="Chart">
            <button
              class="chip"
              aria-pressed={view() !== "months"}
              onClick={() => setView("pie")}
            >
              By category
            </button>
            <button
              class="chip"
              aria-pressed={view() === "months"}
              onClick={() => setView("months")}
            >
              By month
            </button>
          </div>
          <button
            class="btn btn-sm"
            aria-pressed={showTable()}
            onClick={() => setTableParam(showTable() ? "" : "1")}
          >
            {showTable() ? "Chart" : "Table"}
          </button>
        </div>
        <p class="card-sub">
          <Show
            when={view() === "months"}
            fallback={
              <>
                Spending only, largest first — refunds net against their category. Select a
                category to filter the transactions below.
              </>
            }
          >
            Every month in the period, including quiet ones.
          </Show>{" "}
          Transfers between your own accounts are excluded, so a card payment isn't
          counted twice.
        </p>

        <Switch>
          <Match when={view() === "months" && months().length === 0}>
            <p class="muted">No transactions in this period.</p>
          </Match>
          <Match when={view() === "months" && showTable()}>
            <MonthTable data={months()} />
          </Match>
          <Match when={view() === "months"}>
            <MonthlyFlowChart data={months()} />
          </Match>
          <Match when={categoryTotals().length === 0}>
            <p class="muted">No spending in this period.</p>
          </Match>
          <Match when={showTable()}>
            <CategoryTable data={categoryTotals()} />
          </Match>
          <Match when={true}>
            <SpendingDonut
              slices={slices()}
              all={categoryTotals()}
              selected={selected() || undefined}
              onSelect={toggleCategory}
              hero={{
                label: "Total spent",
                value: formatMoney(summary().outCents),
                meta: (
                  <Show
                    when={spendDelta() != null}
                    fallback={<>{summary().count} transactions</>}
                  >
                    <span class={`delta ${spendDelta()! > 0 ? "up" : "down"}`}>
                      {spendDelta()! > 0 ? "▲" : "▼"}{" "}
                      {Math.abs(spendDelta()! * 100).toFixed(0)}%
                    </span>{" "}
                    vs previous
                  </Show>
                ),
              }}
              stats={[
                { label: "Income", value: formatMoney(summary().inCents) },
                {
                  label: "Net",
                  value: formatMoney(summary().netCents),
                  tone: summary().netCents < 0 ? "critical" : "good",
                },
              ]}
            />
          </Match>
        </Switch>

        <Show when={view() === "months" && !showTable() && trend() && trend()!.length > 0}>
          <div
            style={{
              "margin-top": "20px",
              "border-top": "1px solid var(--border)",
              "padding-top": "16px",
            }}
          >
            <div class="card-head">
              <h3>{selectedName()} by month</h3>
            </div>
            <CategoryTrend data={trend()!} label={selectedName()} />
          </div>
        </Show>
      </div>

      <div class="card" id="transactions">
        <div class="card-head">
          <h2>
            Transactions
            <Show when={selectedName()}>
              {" "}
              <span class="pill">{selectedName()}</span>
            </Show>
          </h2>
          <Show when={selected()}>
            <button class="btn btn-sm" onClick={() => setSelected("")}>
              Show all categories
            </button>
          </Show>
        </div>
        <TransactionList
          period={period()}
          accountIds={filter().accountIds}
          categoryIds={selectedIds()}
        />
      </div>
    </div>
  );
}
