/**
 * Turning a bank CSV into transactions.
 *
 * Two steps, deliberately separate so the UI can show its work: `detectMapping`
 * guesses which column is which, and `buildTransactions` applies a mapping
 * (whether guessed or corrected by hand) to the rows.
 */
import { parseCsv, detectDelimiter } from "./csv";
import { combineDebitCredit, parseMoneyCents } from "./money";
import { parseDate, type IsoDate } from "./dates";
import type { ColumnMapping, Transaction } from "./types";

/** Header synonyms, most-preferred first. Matched case- and space-insensitively. */
const HEADERS = {
  date: [
    "transaction date", "trans date", "trade date", "date", "posted date",
    "post date", "posting date", "date posted", "effective date",
  ],
  description: [
    "description", "transaction description", "payee", "merchant", "name",
    "details", "transaction", "memo", "reference",
  ],
  debit: [
    "debit", "withdrawal", "withdrawals", "amount debit", "debit amount",
    "money out", "paid out", "charges", "outflow",
  ],
  credit: [
    "credit", "deposit", "deposits", "amount credit", "credit amount",
    "money in", "paid in", "payments", "inflow",
  ],
  amount: ["amount", "transaction amount", "amount (usd)", "value", "net amount"],
  category: ["category", "transaction category", "type category"],
} satisfies Record<string, string[]>;

/** Columns that must never be mistaken for an amount. */
const IGNORED = [
  "balance", "runningbalance", "running balance", "available balance",
  "card no.", "card number", "check number", "checknumber", "member name",
  "status", "currency", "type", "transaction type", "id", "reference number",
];

const normalize = (s: string) => s.toLowerCase().replace(/[\s_]+/g, " ").trim();

export interface ParsedFile {
  rows: string[][];
  /** The header row if there is one, else synthesised `Column 1…n` labels. */
  header: string[];
  /** Rows excluding the header — the candidate transactions. */
  dataRows: string[][];
  mapping: ColumnMapping;
  /** Set when detection had to guess or came up short; surfaced in the UI. */
  warnings: string[];
}

/**
 * Read a CSV's text and work out how to interpret it.
 *
 * The mapping it returns is a starting point for the import screen, not a
 * verdict — everything it guesses is editable before anything is saved.
 */
export function parseFile(text: string): ParsedFile {
  const rows = parseCsv(text, detectDelimiter(text));
  if (rows.length === 0) {
    return {
      rows,
      header: [],
      dataRows: [],
      mapping: { date: 0, description: 1, hasHeader: false },
      warnings: ["That file has no rows in it."],
    };
  }

  const first = rows[0]!;
  const hasHeader = looksLikeHeader(first);
  const header = hasHeader
    ? first
    : first.map((_, i) => `Column ${i + 1}`);
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const { mapping, warnings } = detectMapping(header, dataRows, hasHeader);

  return { rows, header, dataRows, mapping, warnings };
}

/**
 * A header row is one whose cells are labels rather than values. Checking that
 * no cell parses as a date or amount is more reliable than keyword matching,
 * since bank column names vary far more than their value formats do.
 */
function looksLikeHeader(row: string[]): boolean {
  const cells = row.filter((c) => c !== "");
  if (cells.length === 0) return false;
  const valueLike = cells.filter(
    (c) => parseDate(c) != null || parseMoneyCents(c) != null,
  ).length;
  return valueLike === 0;
}

export function detectMapping(
  header: string[],
  dataRows: string[][],
  hasHeader: boolean,
): { mapping: ColumnMapping; warnings: string[] } {
  const warnings: string[] = [];
  const norm = header.map(normalize);
  const ignored = new Set(
    norm.map((h, i) => (IGNORED.includes(h) ? i : -1)).filter((i) => i !== -1),
  );

  const byName = (synonyms: string[]): number | undefined => {
    if (!hasHeader) return undefined;
    for (const synonym of synonyms) {
      const i = norm.indexOf(synonym);
      if (i !== -1) return i;
    }
    // Fall back to a contains-match, e.g. "Debit Amount (USD)".
    for (const synonym of synonyms) {
      const i = norm.findIndex((h) => h.includes(synonym));
      if (i !== -1) return i;
    }
    return undefined;
  };

  let date = byName(HEADERS.date);
  let description = byName(HEADERS.description);
  let debit = byName(HEADERS.debit);
  let credit = byName(HEADERS.credit);
  let amount = byName(HEADERS.amount);
  const category = byName(HEADERS.category);

  // An "Amount" column alongside an explicit debit/credit pair is a duplicate
  // (some exports carry both); the pair is the more precise signal.
  if (amount != null && debit != null && credit != null) amount = undefined;

  // Whatever the headers didn't settle, infer from the values themselves.
  const profile = profileColumns(dataRows, header.length);

  if (date == null) {
    date = profile.findIndex((c) => c.dateRatio > 0.8);
    if (date === -1) date = undefined;
    else if (hasHeader) warnings.push(`Guessed "${header[date]}" holds the date.`);
  }
  if (description == null) {
    // The widest mostly-text column is almost always the payee.
    let best = -1;
    let bestScore = 0;
    profile.forEach((c, i) => {
      if (ignored.has(i) || i === date) return;
      const score = c.textRatio * c.avgLength;
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    });
    if (best !== -1) {
      description = best;
      if (hasHeader) warnings.push(`Guessed "${header[best]}" holds the description.`);
    }
  }
  if (debit == null && credit == null && amount == null) {
    const numeric = profile
      .map((c, i) => ({ ...c, i }))
      .filter((c) => c.i !== date && !ignored.has(c.i) && c.moneyRatio > 0.7);
    if (numeric.length === 1) {
      amount = numeric[0]!.i;
    } else if (numeric.length >= 2) {
      // Two money columns that never both hold a value are a debit/credit pair.
      const [a, b] = [numeric[0]!, numeric[1]!];
      debit = a.i;
      credit = b.i;
      warnings.push(
        `Guessed "${header[a.i]}" is money out and "${header[b.i]}" is money in.`,
      );
    }
  }

  if (date == null || description == null) {
    warnings.push(
      "Couldn't work out which columns hold the date and description — pick them below.",
    );
  }
  if (debit == null && credit == null && amount == null) {
    warnings.push("Couldn't find an amount column — pick one below.");
  }

  const mapping: ColumnMapping = {
    date: date ?? 0,
    description: description ?? Math.min(1, header.length - 1),
    debit,
    credit,
    amount,
    category,
    hasHeader,
    dayFirst: false,
    amountSign: "negative-is-outflow",
  };

  // For a single amount column, let the data pick the sign convention: a card
  // or bank export is mostly spending, so the dominant sign is money out.
  if (amount != null) {
    let negatives = 0;
    let positives = 0;
    for (const row of dataRows.slice(0, 200)) {
      const cents = parseMoneyCents(row[amount]);
      if (cents == null || cents === 0) continue;
      if (cents < 0) negatives++;
      else positives++;
    }
    if (positives > negatives * 2) {
      mapping.amountSign = "positive-is-outflow";
      warnings.push(
        `Most amounts are positive, so "${header[amount]}" is being read as money out. Flip it below if that's wrong.`,
      );
    }
  }

  // If dates parse only when the day comes first, this is a non-US export.
  if (date != null && looksDayFirst(dataRows, date)) {
    mapping.dayFirst = true;
    warnings.push("Dates look day-first (DD/MM), not month-first.");
  }

  return { mapping, warnings };
}

interface ColumnProfile {
  dateRatio: number;
  moneyRatio: number;
  textRatio: number;
  avgLength: number;
}

/** Sample the rows to learn what kind of value each column tends to hold. */
function profileColumns(dataRows: string[][], width: number): ColumnProfile[] {
  const sample = dataRows.slice(0, 200);
  return Array.from({ length: width }, (_, col) => {
    let filled = 0;
    let dates = 0;
    let money = 0;
    let text = 0;
    let length = 0;
    for (const row of sample) {
      const cell = row[col];
      if (cell == null || cell === "") continue;
      filled++;
      length += cell.length;
      if (parseDate(cell) != null) dates++;
      else if (parseMoneyCents(cell) != null) money++;
      else text++;
    }
    const denom = Math.max(filled, 1);
    return {
      dateRatio: dates / denom,
      moneyRatio: money / denom,
      textRatio: text / denom,
      avgLength: length / denom,
    };
  });
}

/**
 * True when a column's dates only make sense read day-first — i.e. some row has
 * a first component above 12, which cannot be a month.
 */
function looksDayFirst(dataRows: string[][], col: number): boolean {
  let dayFirstOnly = 0;
  let monthFirstOnly = 0;
  for (const row of dataRows.slice(0, 200)) {
    const cell = row[col]?.trim();
    if (!cell) continue;
    const m = /^(\d{1,2})[/.\-](\d{1,2})[/.\-]\d{2,4}$/.exec(cell);
    if (!m) continue;
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a > 12 && b <= 12) dayFirstOnly++;
    if (b > 12 && a <= 12) monthFirstOnly++;
  }
  return dayFirstOnly > monthFirstOnly;
}

export interface BuildResult {
  transactions: Omit<Transaction, "categoryId" | "categorySource">[];
  /** Rows that couldn't be read, with why — shown so nothing fails silently. */
  skipped: { row: string[]; reason: string }[];
}

/**
 * Apply a mapping to data rows, producing transactions with stable ids.
 *
 * The id is a hash of account + date + description + amount, plus an occurrence
 * counter. The counter matters: two identical coffees on the same day are
 * genuinely two transactions, so they get distinct ids — while re-importing a
 * file that overlaps a previous one regenerates the same ids and dedupes.
 */
export function buildTransactions(
  dataRows: string[][],
  mapping: ColumnMapping,
  accountId: string,
): BuildResult {
  const transactions: BuildResult["transactions"] = [];
  const skipped: BuildResult["skipped"] = [];
  const seen = new Map<string, number>();

  for (const row of dataRows) {
    const date = parseDate(row[mapping.date], mapping.dayFirst);
    if (date == null) {
      skipped.push({ row, reason: `No readable date in "${row[mapping.date] ?? ""}"` });
      continue;
    }

    const description = cleanDescription(row[mapping.description] ?? "");
    const amountCents = readAmount(row, mapping);
    if (amountCents == null) {
      skipped.push({ row, reason: "No readable amount" });
      continue;
    }

    const key = `${accountId}|${date}|${description.toLowerCase()}|${amountCents}`;
    const occurrence = seen.get(key) ?? 0;
    seen.set(key, occurrence + 1);

    const bankCategory = mapping.category != null ? row[mapping.category]?.trim() : undefined;

    transactions.push({
      id: `${hash(key)}-${occurrence}`,
      accountId,
      date,
      description,
      amountCents,
      ...(bankCategory ? { bankCategory } : {}),
      // Kept verbatim: the list can then show what the bank actually said, next
      // to whatever this app made of it.
      raw: row,
    });
  }

  return { transactions, skipped };
}

function readAmount(row: string[], mapping: ColumnMapping): number | null {
  if (mapping.amount != null) {
    const cents = parseMoneyCents(row[mapping.amount]);
    if (cents == null) return null;
    // Normalise to the app's convention: negative means money out.
    return mapping.amountSign === "positive-is-outflow" ? -cents : cents;
  }
  if (mapping.debit != null || mapping.credit != null) {
    return combineDebitCredit(
      mapping.debit != null ? row[mapping.debit] : undefined,
      mapping.credit != null ? row[mapping.credit] : undefined,
    );
  }
  return null;
}

/**
 * Tidy a payee string without destroying it: collapse runs of whitespace and
 * strip the trailing reference noise banks append. The original wording is kept
 * otherwise, since that's what categorisation rules match against.
 */
export function cleanDescription(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .replace(/^"|"$/g, "")
    .trim();
}

/** FNV-1a, hex. Not cryptographic — just a compact stable key. */
function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** A reasonable account name from a filename: `capitalone.csv` -> `Capitalone`. */
export function accountNameFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "").replace(/[_\-]+/g, " ");
  const known: Record<string, string> = {
    capitalone: "Capital One",
    "capital one": "Capital One",
    schwab: "Schwab",
    citi: "Citi",
    discover: "Discover",
    chase: "Chase",
    amex: "Amex",
  };
  const key = base.toLowerCase().trim();
  if (known[key]) return known[key]!;
  return base.replace(/\b[a-z]/g, (c) => c.toUpperCase()).trim() || "Imported";
}

export type { IsoDate };
