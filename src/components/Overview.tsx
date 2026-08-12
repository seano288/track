/**
 * The Overview — the whole app, really.
 *
 * One filter row at the top scopes everything below it: the chart card and the
 * transaction list. The card has three views — the donut, a trend, and the same
 * numbers as a table — and picking a wedge or a category row filters the list.
 * Every part of that state lives in the URL, so any view can be linked to or
 * reloaded.
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
import type { CategoryGroup } from "../lib/types";
import {
  CategoryTable,
  CategoryTrend,
  MonthTable,
  MonthlyFlowChart,
  SpendingDonut,
} from "./Charts";
import { TransactionList } from "./TransactionList";

const VIEWS = [
  ["category", "Category"],
  ["trend", "Trend"],
  ["breakdown", "Breakdown"],
] as const;

/**
 * Hidden transactions never reach a report — dropping them here means every
 * total, chart, and delta below is computed from a set they aren't in, rather
 * than each aggregation having to remember to skip them.
 */
const NOT_IN_REPORTS: CategoryGroup[] = ["hidden"];

export function Overview() {
  const { state, latest } = useApp();

  const [periodId, setPeriodId] = urlParam("period", "this-month");
  const [customStart, setCustomStart] = urlParam("from", "");
  const [customEnd, setCustomEnd] = urlParam("to", "");
  const [accountId, setAccountId] = urlParam("account", "all");
  const [selected, setSelected] = urlParam("category", "");
  const [view, setView] = urlParam("view", "category");

  const presets = createMemo(() => periodPresets(latest()));
  const period = createMemo(() =>
    resolvePeriod(periodId(), presets(), { start: customStart(), end: customEnd() }),
  );

  const filter = createMemo(() => ({
    period: period(),
    accountIds: accountId() === "all" ? undefined : [accountId()],
    excludeGroups: NOT_IN_REPORTS,
    categories: state.categories,
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
    if (id === OTHER_SLICE_ID) return "Everything else";
    return state.categories.find((c) => c.id === id)?.name ?? "";
  });

  /**
   * What the trend and the breakdown plot: the selected category month by month
   * when there is one, otherwise money in and out for every month.
   */
  const trend = createMemo(() => {
    const ids = selectedIds();
    return ids ? categoryByMonth(rows(), ids) : undefined;
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
        <div class="notice row">
          <span>
            {uncategorizedCount()} uncategorised transaction
            {uncategorizedCount() === 1 ? "" : "s"}
          </span>
          <button class="btn btn-sm" onClick={showUncategorized}>
            Go fix it
          </button>
        </div>
      </Show>

      {/* One card, three views of the same filtered rows. */}
      <div class="card">
        {/* The period's two other figures live up here, so they read the same in
            every view — total spent stays in the donut's hole. */}
        <div class="card-head">
          <div class="head-stats">
            <span class="stat">
              <span class="label">Income</span>
              <span class="value">{formatMoney(summary().inCents)}</span>
            </span>
            <span class="stat">
              <span class="label">Net</span>
              <span
                class="value"
                style={{ color: summary().netCents < 0 ? "var(--critical)" : "var(--good)" }}
              >
                {formatMoney(summary().netCents)}
              </span>
            </span>
            <Show when={selectedName()}>
              <span class="pill">{selectedName()}</span>
            </Show>
          </div>
          <div class="chip-row" role="group" aria-label="View">
            <For each={VIEWS}>
              {([id, label]) => (
                <button class="chip" aria-pressed={view() === id} onClick={() => setView(id)}>
                  {label}
                </button>
              )}
            </For>
          </div>
        </div>

        <Switch>
          <Match when={view() === "trend" && trend()?.length}>
            <CategoryTrend data={trend()!} label={selectedName()} />
          </Match>
          <Match when={view() === "trend" && !selectedIds() && months().length > 0}>
            <MonthlyFlowChart data={months()} />
          </Match>
          <Match when={view() === "breakdown" && trend()?.length}>
            <MonthTable data={trend()!} spendOnly />
          </Match>
          <Match when={view() === "breakdown" && !selectedIds() && categoryTotals().length > 0}>
            <CategoryTable data={categoryTotals()} />
          </Match>
          <Match when={view() !== "category" || categoryTotals().length === 0}>
            <p class="muted">Nothing to show for this period.</p>
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
            />
          </Match>
        </Switch>
      </div>

      <div class="card" id="transactions">
        <TransactionList
          period={period()}
          accountIds={filter().accountIds}
          categoryIds={selectedIds()}
        />
      </div>
    </div>
  );
}
