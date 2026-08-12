import type { IsoDate } from "./dates";

/**
 * An account is one source of transactions — a card or a bank account. It is
 * created implicitly the first time you import a file against it.
 */
export interface Account {
  id: string;
  name: string;
  /** Only affects presentation and the default sign convention on import. */
  kind: "credit" | "bank";
  /** Remembered so a repeat import from the same bank needs no re-mapping. */
  mapping?: ColumnMapping;
  createdAt: string;
}

export interface Transaction {
  /** Content-derived and stable, so re-importing an overlapping file dedupes. */
  id: string;
  accountId: string;
  date: IsoDate;
  description: string;
  /** Integer cents. Negative = money out. See `money.ts`. */
  amountCents: number;
  categoryId: string;
  /** Where the category came from, so a rule never overwrites your own edit. */
  categorySource: "manual" | "rule" | "bank" | "none";
  /** The bank's own category label, kept for reference when it supplied one. */
  bankCategory?: string;
  notes?: string;
}

export interface Category {
  id: string;
  name: string;
  /**
   * `spending` and `income` are summarised; `transfer` is excluded from both
   * so moving money between your own accounts isn't counted as expense.
   */
  group: "spending" | "income" | "transfer";
}

/** A case-insensitive substring match on the description. */
export interface Rule {
  id: string;
  pattern: string;
  categoryId: string;
  createdAt: string;
}

/**
 * Which CSV columns hold what, by zero-based index.
 *
 * Amounts arrive one of two ways: a `debit`/`credit` column pair (all four
 * sample banks) or a single signed `amount` column (Chase, Amex, and friends).
 */
export interface ColumnMapping {
  date: number;
  description: number;
  debit?: number;
  credit?: number;
  amount?: number;
  category?: number;
  /** For a single amount column: which sign means money leaving the account. */
  amountSign?: "negative-is-outflow" | "positive-is-outflow";
  /** For ambiguous numeric dates like `03/08/2026`. */
  dayFirst?: boolean;
  /** True when the file's first row is a header rather than data. */
  hasHeader: boolean;
}
