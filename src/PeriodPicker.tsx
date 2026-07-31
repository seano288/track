import { For, Show, createSignal } from 'solid-js'
import type { Period, PeriodType } from './domain/period.ts'
import { periodForMonth, periodForQuarter, periodForRange, periodForYear } from './domain/period.ts'

const PERIOD_TYPES: PeriodType[] = ['month', 'quarter', 'year', 'custom']
const QUARTERS = [1, 2, 3, 4]

export function PeriodPicker(props: { period: Period; onChange: (period: Period) => void }) {
  const [type, setType] = createSignal<PeriodType>(props.period.type)
  const [month, setMonth] = createSignal(props.period.start.slice(0, 7))
  const [year, setYear] = createSignal(Number(props.period.start.slice(0, 4)))
  const [quarter, setQuarter] = createSignal(1)
  const [start, setStart] = createSignal(props.period.start)
  const [end, setEnd] = createSignal(props.period.end)

  function emit(currentType: PeriodType) {
    if (currentType === 'month') props.onChange(periodForMonth(month()))
    else if (currentType === 'quarter') props.onChange(periodForQuarter(year(), quarter()))
    else if (currentType === 'year') props.onChange(periodForYear(year()))
    else props.onChange(periodForRange(start(), end()))
  }

  function handleTypeChange(next: PeriodType) {
    setType(next)
    emit(next)
  }

  return (
    <div class="toolbar period-picker">
      <select
        aria-label="Period type"
        value={type()}
        onInput={(event) => handleTypeChange(event.currentTarget.value as PeriodType)}
      >
        <For each={PERIOD_TYPES}>{(option) => <option value={option}>{option}</option>}</For>
      </select>
      <Show when={type() === 'month'}>
        <input
          type="month"
          aria-label="Month"
          value={month()}
          onInput={(event) => {
            setMonth(event.currentTarget.value)
            emit('month')
          }}
        />
      </Show>
      <Show when={type() === 'quarter'}>
        <input
          type="number"
          aria-label="Year"
          value={year()}
          onInput={(event) => {
            setYear(Number(event.currentTarget.value))
            emit('quarter')
          }}
        />
        <select
          aria-label="Quarter"
          value={quarter()}
          onInput={(event) => {
            setQuarter(Number(event.currentTarget.value))
            emit('quarter')
          }}
        >
          <For each={QUARTERS}>{(option) => <option value={option}>Q{option}</option>}</For>
        </select>
      </Show>
      <Show when={type() === 'year'}>
        <input
          type="number"
          aria-label="Year"
          value={year()}
          onInput={(event) => {
            setYear(Number(event.currentTarget.value))
            emit('year')
          }}
        />
      </Show>
      <Show when={type() === 'custom'}>
        <input
          type="date"
          aria-label="Start date"
          value={start()}
          onInput={(event) => {
            setStart(event.currentTarget.value)
            emit('custom')
          }}
        />
        <input
          type="date"
          aria-label="End date"
          value={end()}
          onInput={(event) => {
            setEnd(event.currentTarget.value)
            emit('custom')
          }}
        />
      </Show>
    </div>
  )
}
