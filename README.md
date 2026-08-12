# Track

A spending tracker built around CSV exports from your own bank and card accounts.
No account linking, no budgets, no goals — import statements, see where the money
went.

Everything is stored in your browser's IndexedDB. Nothing is uploaded anywhere,
which also means **clearing site data loses your history** — use Export backup in
Settings.

## Running it

```sh
npm install
npm run dev      # http://localhost:5173
npm test         # parsing and aggregation tests
npm run build    # typecheck + production build into dist/
```

## Reading it

Everything is on one page: a period picker (this month, last month, year to date,
last year, all time, or a custom range), one chart card, and the transaction list
underneath.

Income and net for the period sit at the top of the card, so they read the same in
every view. The card itself has three. **Category** is the donut — total spent in
the hole, and a legend carrying every category as an amount and a share; the tail
of small categories folds into one neutral "Everything else" wedge that a caret
expands. **Trend** is money in and out per month, or the selected category month by
month when one is selected. **Breakdown** is the same numbers as a table.

Clicking a wedge or a legend row filters the list below. Clicking it again, or
picking another category, clears it.

Clicking a payee opens the record behind it: every stored field, the CSV line it
was read from, a **Search Google** button for the cryptic ones, and the date
controls below.

The search box matches anything the row displays — payee, date (`aug 3` or
`2026-08`), account, category, or amount (`22.46`) — so a category name finds all
of its transactions without touching the chart.

The view lives in the URL — `#period=ytd&category=groceries&view=trend&q=costco` —
so a filtered view survives a reload and can be bookmarked or sent to yourself.

## Importing

Drop one or more CSVs on the Import tab. Track guesses which columns hold the
date, payee, and amount, shows you a preview, and lets you correct any of it
before anything is saved. The mapping is remembered per account, so next month's
export needs no setup.

It handles the formats the four files in `sample/` use, and the usual neighbours:

| Variation | Example |
|---|---|
| ISO or US dates | `2026-08-03`, `08/03/2026`, day-first via a toggle |
| Currency formatting | `22.46`, `$587.94`, `"$1,738.99"`, `(35.00)` |
| Separate out/in columns | `Debit`/`Credit`, `Withdrawal`/`Deposit` |
| One signed column | `Amount`, with a sign-convention toggle |
| Empty side written as `0` | Discover's exports |
| Refunds as negative credits | Citi's exports |

Re-importing a file that overlaps one you already imported is safe: rows get a
content-derived id, so duplicates are skipped while two genuinely identical
same-day charges are both kept.

## Two conventions worth knowing

**Money is integer cents** everywhere (`src/lib/money.ts`), signed so that
negative means money left the account. Floats drift once you start summing
thousands of transactions.

**Transfers are excluded from spending and income.** Paying a credit card from
checking moves money without spending it, and the card's own statement already
itemises the purchases — counting the payment too would double it. On the sample
data that distinction is about $57k, so the seed rules in
`src/lib/categories.ts` recognise card payments specifically while leaving loan,
insurance, and utility payments as the real costs they are.

They are also left out of the transaction list, where they were only padding —
77 of the sample's 1,777 rows. **Transfers & hidden** puts them back, and the row
count says how many are being held back so the list never quietly disagrees with
the totals above it.

## Categorising

Transactions are categorised by substring rules against the payee. Changing a
category in the transaction list changes that transaction only; rules are written
in Settings, where "Re-run on all transactions" reapplies them. Your rules beat the
built-in ones, and neither ever overwrites a category you set by hand.

Real statements have a long tail of obscure payees, so expect some Uncategorized
— select several rows in the list and set them in one go.

## Hiding a transaction

Some rows shouldn't count: a work expense you were reimbursed for, a charge the
bank posted twice, a card payment the seed rules didn't recognise. Open the
transaction and press **Hide from reports**, or set its category to **Hidden** —
it's an ordinary category, so it appears in every category picker and in bulk
edits.

Hidden rows are dropped before any total, chart, or delta is computed, and they
leave the list along with transfers until you press **Transfers & hidden**, where
they carry a `hidden` pill. Nothing is deleted: the record and its raw CSV line
are intact, and moving it back out of Hidden restores it everywhere.

## Dates that drifted

Banks post a charge when they get round to it, so a payment due on the 1st shows up
on the 31st when the 1st falls on a weekend — and a month gets billed twice while
its neighbour looks cheap. Open the transaction and move it: **Sep 2026 →** puts it
on the 1st of the next month, **← Jul 2026** on the last day of the previous one.
The move is the smallest one that changes the month, the imported date is kept
(shown in the record and restorable), and the raw CSV line never changes.

## Deploying

`.github/workflows/deploy.yml` runs the tests, builds, and publishes `dist/` to
GitHub Pages on every push to `main`. The Vite `base` is relative, so it works
from a project subpath.

One thing to keep in mind: `package-lock.json` records an absolute URL for every
tarball, so a lockfile generated behind a private company mirror pins all of them
to a host GitHub's runners can't reach — `npm ci` then hangs for eight minutes and
dies with npm's `Exit handler never called!`. The `.npmrc` here pins the public
registry so a local `npm install` can't reintroduce that. If you regenerate the
lockfile some other way, check it: `grep -c registry.npmjs.org package-lock.json`
should match the package count.
