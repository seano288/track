/**
 * Money is integer cents everywhere in this app. Never floats: 0.1 + 0.2 and
 * summing a few thousand transactions in floating point both drift.
 *
 * Sign convention for `amountCents` on a Transaction:
 *   negative = money left the account (a purchase, a withdrawal, a fee)
 *   positive = money arrived (a deposit, a refund, a statement credit)
 *
 * That matches how a bank statement adds up, so a running balance is just a
 * sum. "Spending" in the UI is therefore the negated sum of negative amounts.
 */

/**
 * Parse one money-ish cell into cents, preserving its sign.
 *
 * Copes with the formats the sample exports use and the usual neighbours:
 * `22.46`, `$587.94`, `"$1,738.99"`, `-7.56`, `(35.00)` for negative,
 * `1.234,56` for European decimal commas, and a bare `0`.
 *
 * Returns null for a cell that holds no number at all (blank, `-`, `N/A`),
 * which is how callers tell "no value here" apart from a genuine zero.
 */
export function parseMoneyCents(raw: string | undefined): number | null {
  if (raw == null) return null;
  let s = raw.trim();
  if (s === "" || s === "-" || s === "--") return null;
  if (/^(n\/?a|none|null)$/i.test(s)) return null;

  // Accounting-style negatives: (35.00) means -35.00
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }

  s = s.replace(/[$£€¥₹]/g, "").replace(/\s| /g, "");

  // Leading or trailing sign, e.g. `-7.56` or `7.56-`
  if (s.startsWith("-")) {
    negative = !negative;
    s = s.slice(1);
  } else if (s.startsWith("+")) {
    s = s.slice(1);
  }
  if (s.endsWith("-")) {
    negative = !negative;
    s = s.slice(0, -1);
  }

  s = normalizeDecimalSeparator(s);
  if (s === "" || !/^\d*(\.\d*)?$/.test(s)) return null;

  const [whole = "", frac = ""] = s.split(".");
  // Round rather than truncate so a stray third decimal place doesn't vanish.
  const cents =
    Number(whole || "0") * 100 + Math.round(Number(`0.${frac || "0"}`) * 100);
  if (!Number.isFinite(cents)) return null;
  return negative ? -cents : cents;
}

/**
 * Decide whether `,` and `.` are grouping or decimal separators.
 * `1,234.56` -> `1234.56`;  `1.234,56` -> `1234.56`;  `1,23` -> `1.23`.
 */
function normalizeDecimalSeparator(s: string): string {
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");

  if (lastComma === -1 && lastDot === -1) return s;

  if (lastComma > lastDot) {
    // Comma is rightmost. It's a decimal separator unless it groups thousands
    // (exactly three trailing digits and another separator present).
    const trailing = s.length - lastComma - 1;
    const groupsThousands = trailing === 3 && (lastDot !== -1 || /,/.test(s.slice(0, lastComma)));
    return groupsThousands
      ? s.replace(/[.,]/g, "")
      : s.slice(0, lastComma).replace(/[.,]/g, "") + "." + s.slice(lastComma + 1);
  }

  // Dot is rightmost: dots are decimal, commas group thousands.
  return s.slice(0, lastDot).replace(/[.,]/g, "") + "." + s.slice(lastDot + 1);
}

/**
 * Combine a debit/outflow cell and a credit/inflow cell into one signed value.
 *
 * The sample exports disagree on how they mark the unused side — Capital One
 * and Citi leave it blank, Discover writes `0`, Schwab writes `""` — so a zero
 * counts as absent. Citi also writes refunds as a *negative* number in the
 * Credit column, so each side is taken by magnitude and signed by its column.
 */
export function combineDebitCredit(
  debitRaw: string | undefined,
  creditRaw: string | undefined,
): number | null {
  const debit = parseMoneyCents(debitRaw);
  const credit = parseMoneyCents(creditRaw);
  const hasDebit = debit != null && debit !== 0;
  const hasCredit = credit != null && credit !== 0;

  if (!hasDebit && !hasCredit) {
    // Both sides empty means no amount; both explicitly zero is a real zero.
    return debit === 0 || credit === 0 ? 0 : null;
  }
  const outflow = hasDebit ? Math.abs(debit) : 0;
  const inflow = hasCredit ? Math.abs(credit) : 0;
  return inflow - outflow;
}

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/** `-58794` -> `-$587.94` */
export function formatMoney(cents: number): string {
  return usd.format(cents / 100);
}

/** `-58794` -> `$587.94`; for contexts where a column header carries the sign. */
export function formatMoneyAbs(cents: number): string {
  return usd.format(Math.abs(cents) / 100);
}

/** Compact form for chart axes: `$1.2k`, `$340`. */
export function formatMoneyCompact(cents: number): string {
  const dollars = Math.abs(cents) / 100;
  const sign = cents < 0 ? "-" : "";
  if (dollars >= 1_000_000) return `${sign}$${(dollars / 1_000_000).toFixed(1)}m`;
  if (dollars >= 1_000) return `${sign}$${(dollars / 1_000).toFixed(dollars >= 10_000 ? 0 : 1)}k`;
  return `${sign}$${Math.round(dollars)}`;
}
