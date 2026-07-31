import type { CashFlowTotals } from './breakdown/summarize-period.ts'

export function CashFlowSummary(props: { cashFlow: CashFlowTotals }) {
  function formatAmount(minorUnits: number): string {
    return (minorUnits / 100).toFixed(2)
  }

  return (
    <dl>
      <dt>Income</dt>
      <dd>{formatAmount(props.cashFlow.income)}</dd>
      <dt>Expenses</dt>
      <dd>{formatAmount(props.cashFlow.expenses)}</dd>
      <dt>Net</dt>
      <dd>{formatAmount(props.cashFlow.net)}</dd>
    </dl>
  )
}
