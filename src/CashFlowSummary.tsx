import type { CashFlowTotals } from './breakdown/summarize-period.ts'

export function CashFlowSummary(props: { cashFlow: CashFlowTotals }) {
  function formatAmount(minorUnits: number): string {
    return (minorUnits / 100).toFixed(2)
  }

  return (
    <div class="kpi-strip">
      <div class="kpi">
        <div class="kpi-label">Income</div>
        <div class="kpi-value">{formatAmount(props.cashFlow.income)}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Expenses</div>
        <div class="kpi-value">{formatAmount(props.cashFlow.expenses)}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Net cash flow</div>
        <div
          class="kpi-value"
          classList={{ 'text-good': props.cashFlow.net >= 0, 'text-critical': props.cashFlow.net < 0 }}
        >
          {props.cashFlow.net >= 0 ? '+' : ''}
          {formatAmount(props.cashFlow.net)}
        </div>
      </div>
    </div>
  )
}
