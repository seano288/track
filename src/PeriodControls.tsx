import { For, Show, createSignal } from 'solid-js'
import type { Period } from './domain/period.ts'
import { periodForCustom, periodForLastMonth, periodForThisMonth, periodForYearToDate, periodsEqual } from './domain/period.ts'
import { PeriodPicker } from './PeriodPicker.tsx'

export function PeriodControls(props: { period: Period; onChange: (period: Period) => void }) {
  const quickOptions = [
    { label: 'This month', period: periodForThisMonth() },
    { label: 'Last month', period: periodForLastMonth() },
    { label: 'Year-to-date', period: periodForYearToDate() },
  ]

  const [customOpen, setCustomOpen] = createSignal(
    !quickOptions.some((option) => periodsEqual(props.period, option.period)),
  )

  function selectQuick(period: Period) {
    setCustomOpen(false)
    props.onChange(period)
  }

  // PeriodPicker only understands month/quarter/year/custom — a year-to-date
  // period has no matching type in its dropdown, so hand it off as the
  // equivalent custom range instead of a raw 'year-to-date' period.
  function pickerPeriod(): Period {
    return props.period.type === 'year-to-date' ? periodForCustom(props.period.start, props.period.end) : props.period
  }

  return (
    <div class="period-controls">
      <div class="toolbar period-quick-buttons">
        <For each={quickOptions}>
          {(option) => (
            <button
              type="button"
              classList={{ active: !customOpen() && periodsEqual(props.period, option.period) }}
              onClick={() => selectQuick(option.period)}
            >
              {option.label}
            </button>
          )}
        </For>
        <button type="button" classList={{ active: customOpen() }} onClick={() => setCustomOpen((open) => !open)}>
          Custom…
        </button>
      </div>
      <Show when={customOpen()}>
        <PeriodPicker period={pickerPeriod()} onChange={props.onChange} />
      </Show>
    </div>
  )
}
