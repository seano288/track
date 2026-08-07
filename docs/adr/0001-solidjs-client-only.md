# SolidJS for a client-only, performance-first app

Track is a static web app with no backend in v1 — it runs entirely in the browser and
persists to IndexedDB. Performance on a few thousand transactions (fast sort/filter of
a large table) is an explicit top priority, because laggy large-list interaction was
the main complaint about the tool this replaces (Mint).

We chose **SolidJS + TypeScript + Vite**. Solid's fine-grained reactivity recomputes
and re-renders only what changed (no virtual-DOM diffing), putting it near the top of
js-framework-benchmark for exactly this data-heavy, interactive workload.

## Considered Options

- **React** — largest ecosystem and the most mature table/chart libraries, but its
  re-render-the-component model works against the performance goal by default; you hit
  the target only by leaning heavily on memoization.
- **Svelte 5 (runes)** — compiled and fine-grained, a strong middle ground, but a
  thinner table/charting ecosystem than the alternatives.
- **SolidJS (chosen)** — fine-grained reactivity and near-vanilla benchmark
  performance. The one real risk — table/virtualization maturity — is removed by
  TanStack Virtual, which ships an official Solid adapter.

## Consequences

Smaller ecosystem than React: fewer drop-in components and a smaller hiring/knowledge
pool. Accepted deliberately — this is a single-user personal project where the
performance ceiling matters more than ecosystem breadth.

**Revised during v1 build:** the transaction table uses TanStack Virtual for
virtualization only — sorting and column rendering are hand-rolled directly against the
in-memory array, not TanStack Table. Category breakdown and trend charts are hand-rolled
bars, not a charting library. At this app's scale (a few thousand rows, a dozen bars) the
performance risk TanStack Table would have hedged against never materialized — `solid-virtual`
alone keeps the row count off the DOM — and a charting library would add a dependency
without solving a problem the simple markup doesn't already handle. Revisit only if the
transaction list needs column resizing/reordering/pinning, or charts need interactivity
(tooltips, zoom) that hand-rolled markup can't reasonably grow into.

**Revised again for the account combobox:** the Import section's account picker uses
`@kobalte/core`'s headless Combobox, not hand-rolled markup. Unlike a virtualized list or
a bar chart, a filterable combobox has real accessibility and interaction surface —
listbox/typeahead keyboard navigation, focus management, and floating-UI positioning of
the popover — that a hand-rolled `<input>` + `<div>` pairing would either get subtly wrong
or take real effort to match. Kobalte is scoped to this one control (`AccountCombobox.tsx`);
every other input in the app remains a plain, unstyled native element. Revisit only if
another control needs the same kind of behavior and a second one-off adoption starts to
look like an unstated pattern rather than an exception.
