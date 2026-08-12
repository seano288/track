/**
 * The single source of truth: app state plus the actions that change it.
 *
 * Everything lives in one Solid store that mirrors to IndexedDB after each
 * change. Components read derived values through memos and never mutate state
 * directly — all writes go through the actions here, which is what keeps
 * categorisation and dedupe rules in one place.
 */
import {
  createContext,
  createMemo,
  createSignal,
  onMount,
  useContext,
  type JSX,
} from "solid-js";
import { createStore, produce, unwrap } from "solid-js/store";
import {
  CURRENT_VERSION,
  clearState,
  loadState,
  migrate,
  saveState,
  type PersistedState,
} from "./lib/db";
import { DEFAULT_CATEGORIES, categorize, seedRules, suggestPattern } from "./lib/categories";
import { buildTransactions } from "./lib/import-map";
import { latestDate } from "./lib/summary";
import type { Account, ColumnMapping, Rule, Transaction } from "./lib/types";

export interface ImportOutcome {
  accountId: string;
  accountName: string;
  /** Rows that became new transactions. */
  added: number;
  /** Rows already present from a previous import of overlapping data. */
  duplicates: number;
  /** Rows that couldn't be read, with the reason. */
  skipped: { row: string[]; reason: string }[];
  /** How many of the added rows landed in Uncategorized. */
  uncategorized: number;
}

interface AppActions {
  importRows(input: {
    dataRows: string[][];
    mapping: ColumnMapping;
    accountId?: string;
    accountName?: string;
    accountKind?: Account["kind"];
  }): ImportOutcome;
  setCategory(transactionId: string, categoryId: string, alsoCreateRule?: boolean): void
  setCategoryForMany(transactionIds: string[], categoryId: string): void;
  addRule(pattern: string, categoryId: string): void;
  deleteRule(ruleId: string): void;
  /** Re-run rules over every transaction, leaving manual choices alone. */
  reapplyRules(): void;
  renameAccount(accountId: string, name: string): void;
  deleteAccount(accountId: string): void;
  exportJson(): string;
  importJson(text: string): { ok: true } | { ok: false; error: string };
  clearAll(): void;
}

interface AppContextValue {
  state: PersistedState;
  actions: AppActions;
  /** False until IndexedDB has been read, so the UI can avoid a flash of empty. */
  loaded: () => boolean;
  latest: () => string | undefined;
  accountName: (id: string) => string;
}

const AppContext = createContext<AppContextValue>();

function emptyState(): PersistedState {
  return {
    version: CURRENT_VERSION,
    accounts: [],
    transactions: [],
    categories: DEFAULT_CATEGORIES,
    rules: seedRules(),
  };
}

export function AppProvider(props: { children: JSX.Element }) {
  const [state, setState] = createStore<PersistedState>(emptyState());
  const [loaded, setLoaded] = createSignal(false);

  onMount(async () => {
    try {
      const stored = await loadState();
      const valid = stored ? migrate(stored) : null;
      if (valid) setState(valid);
    } catch (error) {
      // A blocked or unavailable IndexedDB (private browsing, disabled storage)
      // shouldn't break the app — it just won't remember anything.
      console.error("Could not read saved data", error);
    } finally {
      setLoaded(true);
    }
  });

  /**
   * Mirror to storage after changes settle. Debounced because a bulk import
   * touches state repeatedly and only the final result needs writing.
   */
  let saveTimer: number | undefined;
  const persist = () => {
    if (!loaded()) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      // unwrap() strips the reactive proxy; IndexedDB can't structured-clone it.
      saveState(unwrap(state)).catch((error) =>
        console.error("Could not save data", error),
      );
    }, 150) as unknown as number;
  };

  const nextId = (prefix: string) =>
    `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

  const actions: AppActions = {
    importRows({ dataRows, mapping, accountId, accountName, accountKind }) {
      // An account is created implicitly on first import if none was chosen.
      let id = accountId;
      if (!id) {
        id = nextId("acct");
        const account: Account = {
          id,
          name: accountName?.trim() || "Imported",
          kind: accountKind ?? "credit",
          mapping,
          createdAt: new Date().toISOString(),
        };
        setState("accounts", (accounts) => [...accounts, account]);
      } else {
        // Remember the corrected mapping so the next file needs no fixing.
        const index = state.accounts.findIndex((a) => a.id === id);
        if (index !== -1) setState("accounts", index, "mapping", mapping);
      }

      const { transactions: built, skipped } = buildTransactions(dataRows, mapping, id);
      const existing = new Set(state.transactions.map((t) => t.id));

      const fresh: Transaction[] = [];
      let duplicates = 0;
      let uncategorized = 0;

      for (const row of built) {
        if (existing.has(row.id)) {
          duplicates++;
          continue;
        }
        // Guard against a file that repeats a row inside itself.
        existing.add(row.id);
        const { categoryId, source } = categorize(
          row.description,
          row.amountCents,
          state.rules,
          row.bankCategory,
        );
        if (categoryId === "uncategorized") uncategorized++;
        fresh.push({ ...row, categoryId, categorySource: source });
      }

      if (fresh.length > 0) {
        setState("transactions", (transactions) =>
          // Newest first — the order the list and charts both want.
          [...transactions, ...fresh].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
        );
      }
      persist();

      const account = state.accounts.find((a) => a.id === id);
      return {
        accountId: id,
        accountName: account?.name ?? "Imported",
        added: fresh.length,
        duplicates,
        skipped,
        uncategorized,
      };
    },

    setCategory(transactionId, categoryId, alsoCreateRule = false) {
      const index = state.transactions.findIndex((t) => t.id === transactionId);
      if (index === -1) return;
      const description = state.transactions[index]!.description;

      setState("transactions", index, (t) => ({
        ...t,
        categoryId,
        // Marked manual so `reapplyRules` never overwrites a deliberate choice.
        categorySource: "manual",
      }));

      if (alsoCreateRule) {
        const pattern = suggestPattern(description);
        if (pattern) actions.addRule(pattern, categoryId);
      }
      persist();
    },

    setCategoryForMany(transactionIds, categoryId) {
      const targets = new Set(transactionIds);
      setState(
        "transactions",
        produce((transactions: Transaction[]) => {
          for (const t of transactions) {
            if (targets.has(t.id)) {
              t.categoryId = categoryId;
              t.categorySource = "manual";
            }
          }
        }),
      );
      persist();
    },

    addRule(pattern, categoryId) {
      const normalized = pattern.trim().toLowerCase();
      if (!normalized) return;
      const rule: Rule = {
        id: nextId("rule"),
        pattern: normalized,
        categoryId,
        createdAt: new Date().toISOString(),
      };
      setState("rules", (rules) => [
        // Replace an existing user rule for the same pattern rather than stacking.
        ...rules.filter((r) => !(r.pattern === normalized && r.createdAt !== "seed")),
        rule,
      ]);
      // Apply it to matching transactions that haven't been set by hand.
      setState(
        "transactions",
        produce((transactions: Transaction[]) => {
          for (const t of transactions) {
            if (t.categorySource === "manual") continue;
            if (t.description.toLowerCase().includes(normalized)) {
              t.categoryId = categoryId;
              t.categorySource = "rule";
            }
          }
        }),
      );
      persist();
    },

    deleteRule(ruleId) {
      setState("rules", (rules) => rules.filter((r) => r.id !== ruleId));
      actions.reapplyRules();
    },

    reapplyRules() {
      setState(
        "transactions",
        produce((transactions: Transaction[]) => {
          for (const t of transactions) {
            if (t.categorySource === "manual") continue;
            const { categoryId, source } = categorize(
              t.description,
              t.amountCents,
              state.rules,
              t.bankCategory,
            );
            t.categoryId = categoryId;
            t.categorySource = source;
          }
        }),
      );
      persist();
    },

    renameAccount(accountId, name) {
      const index = state.accounts.findIndex((a) => a.id === accountId);
      if (index === -1) return;
      setState("accounts", index, "name", name.trim() || "Imported");
      persist();
    },

    deleteAccount(accountId) {
      // Cascade: an account's transactions have no meaning without it.
      setState("transactions", (transactions) =>
        transactions.filter((t) => t.accountId !== accountId),
      );
      setState("accounts", (accounts) => accounts.filter((a) => a.id !== accountId));
      persist();
    },

    exportJson() {
      return JSON.stringify(unwrap(state), null, 2);
    },

    importJson(text) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        return { ok: false, error: "That file isn't valid JSON." };
      }
      const valid = migrate(parsed);
      if (!valid) {
        return { ok: false, error: "That file isn't a Track backup." };
      }
      setState(valid);
      persist();
      return { ok: true };
    },

    clearAll() {
      setState(emptyState());
      clearState().catch((error) => console.error("Could not clear data", error));
    },
  };

  const latest = createMemo(() => latestDate(state.transactions));
  const accountNames = createMemo(
    () => new Map(state.accounts.map((a) => [a.id, a.name])),
  );

  const value: AppContextValue = {
    state,
    actions,
    loaded,
    latest,
    accountName: (id) => accountNames().get(id) ?? "Unknown account",
  };

  return <AppContext.Provider value={value}>{props.children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside <AppProvider>");
  return context;
}
