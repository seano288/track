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
  TanStack Table and TanStack Virtual, which ship official Solid adapters.

## Consequences

Smaller ecosystem than React: fewer drop-in components and a smaller hiring/knowledge
pool. Accepted deliberately — this is a single-user personal project where the
performance ceiling matters more than ecosystem breadth. Charting is done with a
framework-agnostic library, since charts render aggregated data (a dozen bars, a few
dozen slices) and are never a performance concern.
