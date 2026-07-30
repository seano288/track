# In-memory working set behind async repository interfaces

Track holds at most a few thousand transactions — a few megabytes. Rather than treat
IndexedDB as a query engine (async, awkward for live filtering), we load the entire
dataset into memory on startup and run every filter, sort, and aggregation in plain JS
over in-memory arrays with memoized selectors. IndexedDB is pure persistence, not a
query engine. Combined with a virtualized transaction table (TanStack Virtual), this is
what delivers instant sort/filter on large lists — the explicit performance goal.

Persistence sits behind **async repository interfaces, one per aggregate**
(Transactions, Accounts, Categories, Rules, Column Mappings). Each returns and accepts
plain domain objects; no IndexedDB types leak past the interface. Every method is
`Promise`-based even though the v1 IndexedDB implementation resolves instantly.

## Why

The async seam is cheap insurance for the intended v2: cloud as a **backup / remote
store** (see the direction chosen alongside this decision). Swapping the IndexedDB
implementation for a REST/hosted-DB one is then a drop-in with no change to call sites,
because they already `await`.

## What it must support

The transaction list is the workload this architecture is chosen for. It provides, all
client-side over the in-memory set:

- **Search** — free-text matching over description and note.
- **Filter** — by account, category, direction, date range, amount range, and an
  "uncategorized only" toggle; filters combine.
- **Sort** — by any column (date, description, category, account, amount), ascending or
  descending.

Search, filter, and sort compose into one derived, memoized view that feeds the
virtualized table, so interaction stays instant on the full dataset.

## Explicitly not doing

No per-record versioning, change-log, or conflict resolution. Those serve true
multi-device offline sync, which is **not** the v2 we are targeting. If that future
ever becomes real, it goes behind the same repository interfaces with real requirements
in hand — building it speculatively now would tax the domain model (every entity
carrying versions/timestamps) for a scenario that may never ship.

## Consequences

The whole dataset must fit in memory. Fine at the personal scale this app targets
(thousands of transactions); it would need revisiting only at a scale this app is not
for (hundreds of thousands).
