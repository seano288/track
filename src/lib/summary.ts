/**
 * Aggregations behind the Overview.
 *
 * One rule governs every total here: transactions in a `transfer` category are
 * excluded from both spending and income. Paying a credit card from checking
 * moves money without spending it, and the card's own rows already record the
 * purchases — counting the payment too would double the total.
 *
 * A `hidden` category is stronger still: those rows are dropped by `applyFilter`
 * before any of this sees them, so nothing here has to know about them.
 */
import { formatDate, monthOf, monthRange, today, addMonths, type IsoDate } from "./dates";
import { formatMoney } from "./money";
import type { Account, Category, CategoryGroup, Transaction } from "./types";

export interface Period {
  id: string;
  label: string;
  start: IsoDate;
  end: IsoDate;
}

export const CUSTOM_PERIOD_ID = "custom";

/** Inclusive date-range presets, anchored on the latest data rather than today. */
export function periodPresets(latest?: IsoDate): Period[] {
  // Anchoring on the newest transaction means an export that lags by a few days
  // still shows a populated "this month" instead of an empty one.
  const anchor = latest && latest > today() ? latest : today();
  const thisMonth = monthOf(anchor);
  const lastMonth = addMonths(thisMonth, -1);
  const year = Number(anchor.slice(0, 4));

  return [
    { id: "this-month", label: "This month", start: `${thisMonth}-01`, end: endOfMonth(thisMonth) },
    { id: "last-month", label: "Last month", start: `${lastMonth}-01`, end: endOfMonth(lastMonth) },
    { id: "ytd", label: "Year to date", start: `${year}-01-01`, end: anchor },
    { id: "last-year", label: "Last year", start: `${year - 1}-01-01`, end: `${year - 1}-12-31` },
    { id: "all", label: "All time", start: "1900-01-01", end: "2200-12-31" },
  ];
}

/**
 * Turn a period id — which arrives from the URL and so can be anything — into a
 * real range. An unknown id falls back to the last preset (all time) rather than
 * showing an empty view.
 */
export function resolvePeriod(
  id: string,
  presets: Period[],
  custom?: { start?: string; end?: string },
): Period {
  if (id === CUSTOM_PERIOD_ID) {
    // Either end may be blank while it's being typed; an open end is still a
    // usable range, and a backwards range is swapped rather than left empty.
    let start = custom?.start || "1900-01-01";
    let end = custom?.end || "2200-12-31";
    if (start > end) [start, end] = [end, start];
    return { id: CUSTOM_PERIOD_ID, label: "Custom range", start, end };
  }
  return presets.find((p) => p.id === id) ?? presets[presets.length - 1]!;
}

export function endOfMonth(month: string): IsoDate {
  const [y, m] = month.split("-").map(Number);
  if (y == null || m == null) return `${month}-28`;
  return `${month}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0")}`;
}

export interface Filter {
  period: { start: IsoDate; end: IsoDate };
  accountIds?: string[];
  categoryIds?: string[];
  /**
   * Case-insensitive substring across every field the row shows: `cost` matches
   * the payee `COSTCO`, `groc` its category, `aug 15` its date, `22.46` its
   * amount. Needs `categories` and `accounts` to see the labels.
   */
  query?: string;
  /** `out` keeps only money leaving, `in` only money arriving. */
  direction?: "all" | "out" | "in";
  /**
   * Category groups to drop. Reports pass `hidden`; the transaction list adds
   * `transfer`, which is noise in a list of spending until you go looking for it.
   */
  excludeGroups?: CategoryGroup[];
  /** The labels `query` and `excludeGroups` are resolved against. */
  categories?: Category[];
  accounts?: Account[];
}

export function applyFilter(transactions: Transaction[], filter: Filter): Transaction[] {
  const query = filter.query?.trim().toLowerCase();
  const accounts = filter.accountIds?.length ? new Set(filter.accountIds) : null;
  const categories = filter.categoryIds?.length ? new Set(filter.categoryIds) : null;
  const dropped = excludedCategoryIds(filter);
  const rowText = query ? searchableText(filter) : null;

  return transactions.filter((t) => {
    if (t.date < filter.period.start || t.date > filter.period.end) return false;
    if (accounts && !accounts.has(t.accountId)) return false;
    if (categories && !categories.has(t.categoryId)) return false;
    if (dropped?.has(t.categoryId)) return false;
    if (filter.direction === "out" && t.amountCents >= 0) return false;
    if (filter.direction === "in" && t.amountCents <= 0) return false;
    if (rowText && !rowText(t).includes(query!)) return false;
    return true;
  });
}

function excludedCategoryIds(filter: Filter): Set<string> | null {
  if (!filter.excludeGroups?.length) return null;
  const groups = new Set<CategoryGroup>(filter.excludeGroups);
  const ids = (filter.categories ?? []).filter((c) => groups.has(c.group)).map((c) => c.id);
  return ids.length > 0 ? new Set(ids) : null;
}

/**
 * A row rendered as one lowercased string, so searching matches what is on
 * screen rather than only the payee — including the date and amount in the form
 * the table prints them, because that is how you'd type them.
 */
function searchableText(filter: Filter): (t: Transaction) => string {
  // Missing labels read as empty rather than as "Uncategorized", so a search for
  // that word finds the rows that really are uncategorised.
  const categoryNames = new Map((filter.categories ?? []).map((c) => [c.id, c.name]));
  const accountNames = new Map((filter.accounts ?? []).map((a) => [a.id, a.name]));

  return (t) =>
    [
      t.date,
      formatDate(t.date),
      t.description,
      accountNames.get(t.accountId) ?? "",
      categoryNames.get(t.categoryId) ?? "",
      formatMoney(t.amountCents),
    ]
      .join(" ")
      .toLowerCase();
}

export interface Totals {
  /** Money that arrived, as a positive number. Transfers excluded. */
  inCents: number;
  /** Money that left, as a positive number. Transfers excluded. */
  outCents: number;
  /** `inCents - outCents`; negative means you spent more than you took in. */
  netCents: number;
  /** Transfers, reported separately so the money isn't silently missing. */
  transferCents: number;
  count: number;
}

export function totals(transactions: Transaction[], categories: Category[]): Totals {
  const groupOf = groupLookup(categories);
  let inCents = 0;
  let outCents = 0;
  let transferCents = 0;

  for (const t of transactions) {
    if (groupOf(t.categoryId) === "transfer") {
      transferCents += Math.abs(t.amountCents);
      continue;
    }
    if (t.amountCents < 0) outCents += -t.amountCents;
    else inCents += t.amountCents;
  }

  return { inCents, outCents, netCents: inCents - outCents, transferCents, count: transactions.length };
}

export interface CategoryTotal {
  categoryId: string;
  name: string;
  /** Positive cents spent. */
  cents: number;
  count: number;
  /** Fraction of total spending, 0–1. */
  share: number;
}

/**
 * Spending per category, largest first.
 *
 * Refunds net against the category they came back to, so a returned $600 sofa
 * doesn't leave $600 of phantom furniture spending on the chart. A category that
 * nets out positive (refunded more than spent) is dropped rather than drawn as a
 * negative bar.
 */
export function spendingByCategory(
  transactions: Transaction[],
  categories: Category[],
): CategoryTotal[] {
  const groupOf = groupLookup(categories);
  const nameOf = nameLookup(categories);
  const sums = new Map<string, { cents: number; count: number }>();

  for (const t of transactions) {
    const group = groupOf(t.categoryId);
    if (group === "transfer" || group === "income") continue;
    const entry = sums.get(t.categoryId) ?? { cents: 0, count: 0 };
    entry.cents += -t.amountCents; // outflows are negative, so this accumulates positive
    entry.count += 1;
    sums.set(t.categoryId, entry);
  }

  const rows = [...sums.entries()]
    .map(([categoryId, { cents, count }]) => ({
      categoryId,
      name: nameOf(categoryId),
      cents,
      count,
      share: 0,
    }))
    .filter((r) => r.cents > 0)
    .sort((a, b) => b.cents - a.cents);

  const total = rows.reduce((sum, r) => sum + r.cents, 0);
  for (const row of rows) row.share = total === 0 ? 0 : row.cents / total;
  return rows;
}

export interface MonthTotal {
  month: string;
  /** Positive cents. */
  inCents: number;
  /** Positive cents. */
  outCents: number;
  netCents: number;
}

/**
 * Money in and out per calendar month, including months with no activity so the
 * chart shows a real gap rather than silently closing it up.
 */
export function byMonth(transactions: Transaction[], categories: Category[]): MonthTotal[] {
  const groupOf = groupLookup(categories);
  const sums = new Map<string, { inCents: number; outCents: number }>();

  for (const t of transactions) {
    if (groupOf(t.categoryId) === "transfer") continue;
    const month = monthOf(t.date);
    const entry = sums.get(month) ?? { inCents: 0, outCents: 0 };
    if (t.amountCents < 0) entry.outCents += -t.amountCents;
    else entry.inCents += t.amountCents;
    sums.set(month, entry);
  }

  if (sums.size === 0) return [];
  const months = [...sums.keys()].sort();
  return monthRange(months[0]!, months[months.length - 1]!).map((month) => {
    const entry = sums.get(month) ?? { inCents: 0, outCents: 0 };
    return { month, ...entry, netCents: entry.inCents - entry.outCents };
  });
}

/**
 * Spending per month in one category, or in a set of them — the folded "Other"
 * wedge stands for several categories at once.
 */
export function categoryByMonth(
  transactions: Transaction[],
  categoryId: string | string[],
): MonthTotal[] {
  const wanted = new Set(Array.isArray(categoryId) ? categoryId : [categoryId]);
  const rows = transactions.filter((t) => wanted.has(t.categoryId));
  if (rows.length === 0) return [];
  const sums = new Map<string, number>();
  for (const t of rows) {
    const month = monthOf(t.date);
    sums.set(month, (sums.get(month) ?? 0) + -t.amountCents);
  }
  const months = [...sums.keys()].sort();
  return monthRange(months[0]!, months[months.length - 1]!).map((month) => {
    const cents = sums.get(month) ?? 0;
    return { month, inCents: 0, outCents: cents, netCents: -cents };
  });
}

export const OTHER_SLICE_ID = "__other";

export interface CategorySlice extends CategoryTotal {
  /** Category ids folded into this slice; empty when it is a single category. */
  members: string[];
}

/**
 * Collapse a ranked category list down to at most `max` pie slices.
 *
 * Past seven or eight wedges the small ones are slivers and the palette runs out
 * of hues a reader can tell apart, so the tail folds into one "Other". Nothing is
 * lost: the legend beside the pie still lists every category, and clicking Other
 * filters to exactly the categories inside it.
 */
export function foldCategories(rows: CategoryTotal[], max = 7): CategorySlice[] {
  if (rows.length <= max) return rows.map((row) => ({ ...row, members: [] }));

  const head = rows.slice(0, max - 1).map((row) => ({ ...row, members: [] }));
  const tail = rows.slice(max - 1);
  const cents = tail.reduce((sum, r) => sum + r.cents, 0);
  return [
    ...head,
    {
      categoryId: OTHER_SLICE_ID,
      // Not just "Other": there is a real category by that name.
      name: `Everything else (${tail.length} categories)`,
      cents,
      count: tail.reduce((sum, r) => sum + r.count, 0),
      share: tail.reduce((sum, r) => sum + r.share, 0),
      members: tail.map((r) => r.categoryId),
    },
  ];
}

function groupLookup(categories: Category[]) {
  const map = new Map(categories.map((c) => [c.id, c.group]));
  return (id: string) => map.get(id) ?? "spending";
}

function nameLookup(categories: Category[]) {
  const map = new Map(categories.map((c) => [c.id, c.name]));
  return (id: string) => map.get(id) ?? "Uncategorized";
}

/** The newest transaction date, for anchoring period presets. */
export function latestDate(transactions: Transaction[]): IsoDate | undefined {
  let latest: IsoDate | undefined;
  for (const t of transactions) if (latest == null || t.date > latest) latest = t.date;
  return latest;
}
