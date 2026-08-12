/**
 * Persistence: one IndexedDB record holding the whole app state.
 *
 * IndexedDB rather than localStorage because a few years of transactions across
 * several accounts will pass localStorage's ~5MB ceiling, and it fails by
 * throwing mid-write — which would mean silently losing data. A single record is
 * enough: the whole dataset is small enough to hold in memory, and it makes
 * saves atomic, so a crash can't leave half-written state.
 */
import type { Account, Category, Rule, Transaction } from "./types";

const DB_NAME = "track";
const DB_VERSION = 1;
const STORE = "state";
const KEY = "app";

export interface PersistedState {
  /** Bumped when the shape changes, so `migrate` knows what it's reading. */
  version: number;
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  rules: Rule[];
}

export const CURRENT_VERSION = 1;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadState(): Promise<PersistedState | null> {
  const db = await open();
  try {
    return await new Promise<PersistedState | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const request = tx.objectStore(STORE).get(KEY);
      request.onsuccess = () => resolve((request.result as PersistedState) ?? null);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function saveState(state: PersistedState): Promise<void> {
  const db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(state, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function clearState(): Promise<void> {
  const db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/**
 * Validate and upgrade whatever came out of storage or a backup file.
 *
 * Anything unrecognised is rejected rather than half-loaded, so a truncated or
 * hand-edited backup can't quietly wipe good data.
 */
export function migrate(raw: unknown): PersistedState | null {
  if (raw == null || typeof raw !== "object") return null;
  const state = raw as Partial<PersistedState>;
  if (
    !Array.isArray(state.accounts) ||
    !Array.isArray(state.transactions) ||
    !Array.isArray(state.categories) ||
    !Array.isArray(state.rules)
  ) {
    return null;
  }
  return {
    version: CURRENT_VERSION,
    accounts: state.accounts,
    transactions: state.transactions,
    categories: state.categories,
    rules: state.rules,
  };
}
