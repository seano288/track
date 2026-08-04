import { For, Show, createMemo } from 'solid-js'
import { assignCategoryColors, colorFor } from './breakdown/category-color.ts'
import type { CategoryBreakdownRow } from './breakdown/summarize-period.ts'
import type { Category } from './domain/category.ts'
import { formatAmount } from './domain/money.ts'

export function CategoryBreakdown(props: { breakdown: CategoryBreakdownRow[]; categories: Category[] }) {
  const colors = createMemo(() => assignCategoryColors(props.categories))

  function maxAmount(): number {
    return Math.max(...props.breakdown.map((row) => row.amount), 1)
  }

  return (
    <section>
      <h1>Where did my money go?</h1>
      <Show when={props.breakdown.length > 0} fallback={<p>No spending in this period.</p>}>
        <div class="bar-row bar-head">
          <span>Category</span>
          <span />
          <span class="bar-amount">Amount</span>
          <span class="bar-pct">%</span>
        </div>
        <For each={props.breakdown}>
          {(row) => (
            <div class="bar-row">
              <span class="bar-name">{row.categoryName}</span>
              <span class="bar-track">
                <span
                  class="bar-fill"
                  style={{
                    width: `${Math.max((row.amount / maxAmount()) * 100, 0)}%`,
                    background: colorFor(colors(), row.categoryId),
                  }}
                />
              </span>
              <span class="bar-amount">{formatAmount(row.amount)}</span>
              <span class="bar-pct">{row.percentage.toFixed(1)}%</span>
            </div>
          )}
        </For>
      </Show>
    </section>
  )
}
