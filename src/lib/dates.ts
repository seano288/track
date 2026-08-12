/**
 * Dates are ISO `YYYY-MM-DD` strings everywhere in this app.
 *
 * They sort lexicographically, compare with `===`, and survive JSON round-trips
 * unchanged. Critically, they are never fed to `new Date(str)` for display:
 * `new Date("2026-08-03")` is parsed as UTC midnight, which renders as Aug 2
 * anywhere west of Greenwich. Formatting reads the string's parts directly.
 */
export type IsoDate = string;

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Parse a date cell into `YYYY-MM-DD`, or null if it isn't a date.
 *
 * Recognises ISO (`2026-08-03`), US slash/dash (`08/03/2026`, `8-3-26`),
 * dotted (`03.08.2026`), and month-name forms (`3 Aug 2026`, `Aug 3, 2026`).
 * For ambiguous numeric forms like `03/08/2026`, `dayFirst` decides; US
 * month-first is the default because that is what the sample exports use.
 */
export function parseDate(raw: string | undefined, dayFirst = false): IsoDate | null {
  if (raw == null) return null;
  const s = raw.trim().replace(/^"|"$/g, "");
  if (s === "") return null;

  // ISO first — unambiguous, so it ignores dayFirst. Trailing time is dropped.
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/.exec(s);
  if (iso) return build(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  // Numeric with separators: 08/03/2026, 8.3.26, 2026/08/03
  const numeric = /^(\d{1,4})[/.\-](\d{1,2})[/.\-](\d{2,4})(?:[T ].*)?$/.exec(s);
  if (numeric) {
    const a = Number(numeric[1]);
    const b = Number(numeric[2]);
    const c = Number(numeric[3]);
    // Four-digit leading group means year-first (2026/08/03).
    if (numeric[1]!.length === 4) return build(a, b, c);
    // A first group above 12 can only be a day, whatever the locale claims.
    const monthFirst = a <= 12 && !(dayFirst && b <= 12);
    const month = monthFirst ? a : b;
    const day = monthFirst ? b : a;
    return build(expandYear(c), month, day);
  }

  // Month-name forms: "3 Aug 2026", "Aug 3, 2026", "03-Aug-2026"
  const named = /^(\d{1,2})[\s\-]*([A-Za-z]{3,})[\s\-,]*(\d{2,4})$/.exec(s);
  if (named) {
    const month = monthFromName(named[2]!);
    if (month) return build(expandYear(Number(named[3])), month, Number(named[1]));
  }
  const namedFirst = /^([A-Za-z]{3,})[\s\-]*(\d{1,2})[\s\-,]*(\d{2,4})$/.exec(s);
  if (namedFirst) {
    const month = monthFromName(namedFirst[1]!);
    if (month) return build(expandYear(Number(namedFirst[3])), month, Number(namedFirst[2]));
  }

  return null;
}

function monthFromName(name: string): number | null {
  const key = name.slice(0, 3).toLowerCase();
  const index = MONTH_NAMES.findIndex((m) => m.toLowerCase() === key);
  return index === -1 ? null : index + 1;
}

/** `26` -> 2026, `98` -> 1998. Two-digit years pivot at +10 years out. */
function expandYear(year: number): number {
  if (year >= 1000) return year;
  const currentCentury = Math.floor(new Date().getFullYear() / 100) * 100;
  const candidate = currentCentury + year;
  return candidate > new Date().getFullYear() + 10 ? candidate - 100 : candidate;
}

function build(year: number, month: number, day: number): IsoDate | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  // Reject impossible days (Feb 30) rather than silently rolling them over.
  if (day > daysInMonth(year, month)) return null;
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, "0");
}

/** Today, in the browser's local timezone. */
export function today(): IsoDate {
  const now = new Date();
  return `${pad(now.getFullYear(), 4)}-${pad(now.getMonth() + 1, 2)}-${pad(now.getDate(), 2)}`;
}

/** `2026-08-03` -> `Aug 3, 2026`. Reads the string; never constructs a Date. */
export function formatDate(iso: IsoDate): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${MONTH_NAMES[Number(m) - 1] ?? m} ${Number(d)}, ${y}`;
}

/** `2026-08-03` -> `2026-08` */
export function monthOf(iso: IsoDate): string {
  return iso.slice(0, 7);
}

/** `2026-08` -> `Aug 2026` */
export function formatMonth(month: string): string {
  const [y, m] = month.split("-");
  if (!y || !m) return month;
  return `${MONTH_NAMES[Number(m) - 1] ?? m} ${y}`;
}

/** `2026-08` -> `Aug`, for dense chart axes. */
export function formatMonthShort(month: string): string {
  const m = month.split("-")[1];
  return MONTH_NAMES[Number(m) - 1] ?? month;
}

/** Add (or subtract) whole months to a `YYYY-MM` key. */
export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  if (y == null || m == null) return month;
  const total = y * 12 + (m - 1) + delta;
  return `${pad(Math.floor(total / 12), 4)}-${pad((total % 12) + 1, 2)}`;
}

/** Every `YYYY-MM` from start to end inclusive, so charts show empty months. */
export function monthRange(startMonth: string, endMonth: string): string[] {
  const out: string[] = [];
  let cursor = startMonth;
  // Bounded so a reversed or malformed range can't spin forever.
  for (let i = 0; i < 1200 && cursor <= endMonth; i++) {
    out.push(cursor);
    cursor = addMonths(cursor, 1);
  }
  return out;
}

/**
 * Nudge a date across a month boundary — the smallest move that changes its
 * month, so `+1` from Jul 31 is Aug 1 and `-1` back is Jul 31 again.
 *
 * This is for charges that drifted: a payment due on the 1st that the bank
 * posted on the 31st because the 1st was a weekend belongs to the next month's
 * spending, not to a month it only touched by two days.
 */
export function bumpMonth(iso: IsoDate, delta: 1 | -1): IsoDate {
  const firstOfMonth = `${monthOf(iso)}-01`;
  return delta > 0 ? `${addMonths(monthOf(iso), 1)}-01` : addDays(firstOfMonth, -1);
}

/** Shift an ISO date by whole days, via UTC so DST can't move the result. */
export function addDays(iso: IsoDate, delta: number): IsoDate {
  const [y, m, d] = iso.split("-").map(Number);
  if (y == null || m == null || d == null) return iso;
  const t = new Date(Date.UTC(y, m - 1, d + delta));
  return `${pad(t.getUTCFullYear(), 4)}-${pad(t.getUTCMonth() + 1, 2)}-${pad(t.getUTCDate(), 2)}`;
}
