# Track

A private, personal cash-flow tracker. It answers one question: where did my money
go (and come from)? It records transactions that already happened, categorizes them,
and shows breakdowns over time. It is retrospective — not a budgeting, forecasting,
or net-worth tool.

## Language

**Transaction**:
A single movement of money that already happened. Either **imported** from an account's
CSV or **manual** (typed by the user, e.g. a cash purchase). For imported transactions
the raw fields — date, amount, description — are immutable; only the user-owned fields
(category, direction, note) can change. Manual transactions are fully editable.
_Avoid_: Entry, record, payment

**Note**:
An optional free-text annotation the user adds to a transaction — e.g. to decode a
cryptic bank description. Never affects de-duplication.
_Avoid_: Memo, comment, description

**Cash flow**:
The net of money in minus money out over a period. The headline number the app exists
to surface.
_Avoid_: Balance, net worth

**Account**:
A single source of transactions the user imports from — one checking account, one
credit card, etc. Each account has its own CSV format. The user has about six.
_Avoid_: Source, bank, feed

**Category**:
A user-facing label for what a transaction was for — Groceries, Rent, Salary. Flat
(no sub-categories). The app ships a starter set the user can rename, add to, or
delete. Every expense and income transaction has exactly one.
_Avoid_: Tag, label, bucket

**Rule**:
A saved pattern matched against a transaction's description that assigns a category
automatically on import — e.g. description contains "WHOLEFDS" → Groceries.
_Avoid_: Filter, matcher

**Uncategorized**:
The state of a transaction no rule matched and the user has not yet categorized by
hand. A review screen exists to clear these.
_Avoid_: Unknown, untagged, pending

**Column Mapping**:
A saved, per-account configuration that tells the app how to read that account's CSV —
which columns are date, amount, and description; the date format; and whether the
amount is one signed column or separate debit/credit columns. Established on first
import, reused silently thereafter.
_Avoid_: Format, schema, template

**Import**:
One act of bringing a single CSV file into an account. Applies rules, de-duplicates
against what's already stored (by bank transaction ID when present, otherwise by an
`account + date + amount + description` fingerprint), and reports a summary of how many
rows were new versus already seen. Writes without a separate confirmation step.
_Avoid_: Upload, sync, batch load

## Direction

Every transaction has exactly one direction. Direction is what keeps transfers out of
spending totals.

**Income**:
Money entering the user's world from outside — salary, a refund, interest.

**Expense**:
Money leaving the user's world to outside — groceries, rent, a subscription. Amounts
can be negative: a **refund** is a negative expense tagged to the category it reverses,
so that category's total nets correctly. Refunds are never modelled as income (income
is reserved for genuinely new money).

**Transfer**:
Money moving between two of the user's own accounts — paying a credit card from
checking, moving to savings. Nets to zero and is excluded from spending and income
totals. In v1 the user tags transfers manually.
_Avoid_: Internal payment, self-payment
