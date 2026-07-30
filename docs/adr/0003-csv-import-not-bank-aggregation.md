# CSV import, not automatic bank aggregation

Track is a Mint-like spending tracker, but it deliberately omits Mint's signature
feature: automatic bank-account aggregation. Transactions enter Track two ways —
**CSV import** (the primary path, one saved Column Mapping per account) and **manual
entry** (secondary, for cash and corrections). There is no connection to banks.

## Why

Automatic aggregation (Plaid/Yodlee-style) means storing third-party bank credentials,
per-connection fees, OAuth flows to each institution, and ongoing breakage as banks
change. For a single-user, private, client-only app with no backend, that cost is
wildly out of proportion to the benefit. Banks already export CSVs; importing them
gets the same data with none of the liability.

## Consequences

The user does periodic manual work: download a CSV, import it. De-duplication (bank
transaction ID when present, else an `account + date + amount + description`
fingerprint) exists precisely because this manual, overlapping-export workflow will
re-present transactions the app has already seen. If effortless always-fresh data ever
becomes a hard requirement, that is a different product with a backend — not a tweak to
this one.
