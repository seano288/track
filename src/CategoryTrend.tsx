import { For, Show, createMemo } from 'solid-js'
import { assignCategoryColors, colorFor } from './breakdown/category-color.ts'
import type { CategoryTrendRow, TrendSummary } from './breakdown/summarize-trend.ts'
import type { Category } from './domain/category.ts'

export function CategoryTrend(props: { trend: TrendSummary; categories: Category[] }) {
  const colors = createMemo(() => assignCategoryColors(props.categories))

  function formatAmount(minorUnits: number): string {
    return (minorUnits / 100).toFixed(2)
  }

  function rowMax(row: CategoryTrendRow): number {
    return Math.max(...Object.values(row.amountsByMonth), 1)
  }

  return (
    <section>
      <h1>Spending trend</h1>
      <Show when={props.trend.rows.length > 0} fallback={<p>No spending to trend in this period.</p>}>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <For each={props.trend.months}>{(month) => <th>{month}</th>}</For>
            </tr>
          </thead>
          <tbody>
            <For each={props.trend.rows}>
              {(row) => (
                <tr>
                  <td class="bar-name">{row.categoryName}</td>
                  <For each={props.trend.months}>
                    {(month) => {
                      const amount = row.amountsByMonth[month] ?? 0
                      return (
                        <td class="trend-cell">
                          <span
                            class="trend-fill"
                            style={{
                              width: `${Math.max((amount / rowMax(row)) * 100, 0)}%`,
                              background: colorFor(colors(), row.categoryId),
                            }}
                          />
                          <span class="trend-value" title={`${row.categoryName} — ${month}: ${formatAmount(amount)}`}>
                            {formatAmount(amount)}
                          </span>
                        </td>
                      )
                    }}
                  </For>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </Show>
    </section>
  )
}
