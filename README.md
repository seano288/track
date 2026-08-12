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

The chart card opens on the donut — total spent in the hole, income and net beneath
it, and a legend that carries every category as an amount and a share. Clicking a
wedge or a legend row filters the list below; the tail of small categories folds
into one neutral "Everything else" wedge that can be expanded. **By month** swaps
in money in and out per month (plus the selected category's own trend), and
**Table** shows whichever chart is open as numbers.

The view lives in the URL — `#period=ytd&category=groceries&view=months&q=costco` —
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

## Categorising

Transactions are categorised by substring rules against the payee. Changing a
category in the transaction list also creates a rule by default, so the next
matching charge sorts itself. Your rules beat the built-in ones, and neither ever
overwrites a category you set by hand. Rules live in Settings, where
"Re-run on all transactions" reapplies them.

Real statements have a long tail of obscure payees, so expect some Uncategorized
— select several rows in the list and set them in one go.

## Deploying

`.github/workflows/deploy.yml` publishes `dist/` to GitHub Pages on every push to
`main`. The Vite `base` is relative, so it works from a project subpath.
