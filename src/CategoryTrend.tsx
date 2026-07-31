import { For, Show } from 'solid-js'
import type { TrendSummary } from './breakdown/summarize-trend.ts'

export function CategoryTrend(props: { trend: TrendSummary }) {
  function formatAmount(minorUnits: number): string {
    return (minorUnits / 100).toFixed(2)
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
                  <td>{row.categoryName}</td>
                  <For each={props.trend.months}>{(month) => <td>{formatAmount(row.amountsByMonth[month] ?? 0)}</td>}</For>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </Show>
    </section>
  )
}
