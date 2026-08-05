# Warn about no backup, defer building export/backup

Track persists all data exclusively to browser IndexedDB (see ADR 0001) — there is no
backend, no export feature, and no `storage.persist()` call requesting durable storage
from the browser. Clearing site data, resetting the browser, switching browsers, or
switching devices permanently deletes every transaction, category, rule, and account,
with no way to recover them.

We chose to **mitigate this now with an in-app warning**, not by building an export or
backup feature.

## Why

A dismissible banner, rendered once in the app shell above the sidebar/main split so it
is visible regardless of which tab is active, tells the user the risk plainly: data
lives only in this browser, and there is currently no backup or recovery. It's a few
hours of work and removes the worst outcome — a user losing months of transaction
history without ever having been told that was possible.

An actual export/backup feature (a JSON/CSV dump the user can save elsewhere, or restore
from) is real work: a file format to design and version, a restore path that merges or
replaces the working set, and UI for both directions. That's disproportionate to build
before anyone has hit the problem the warning already discloses.

## Consequences

Users can still lose their data. The banner is a disclosure, not a fix. Building
export/backup is deferred to separate future work; revisit once a user actually asks
for it, or once the data volume/stakes in this app grow enough that "you were warned"
stops being an acceptable answer.
