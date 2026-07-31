import { For, Show } from 'solid-js'
import type { CategoryBreakdownRow } from './breakdown/summarize-period.ts'

export function CategoryBreakdown(props: { breakdown: CategoryBreakdownRow[] }) {
  function formatAmount(minorUnits: number): string {
    return (minorUnits / 100).toFixed(2)
  }

  return (
    <section>
      <h1>Where did my money go?</h1>
      <Show when={props.breakdown.length > 0} fallback={<p>No spending in this period.</p>}>
        <ul>
          <For each={props.breakdown}>
            {(row) => (
              <li>
                {row.categoryName} — {formatAmount(row.amount)} — {row.percentage.toFixed(1)}%
              </li>
            )}
          </For>
        </ul>
      </Show>
    </section>
  )
}
