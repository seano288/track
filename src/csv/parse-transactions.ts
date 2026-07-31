import type { AmountMapping, ColumnMapping, DateFormat } from '../domain/column-mapping.ts'
import type { Direction, NewTransaction } from '../domain/transaction.ts'
import { UNCATEGORIZED } from '../domain/transaction.ts'

export function parseDate(value: string, format: DateFormat): string {
  const trimmed = value.trim()

  if (format === 'YYYY-MM-DD') {
    const [year, month, day] = trimmed.split('-')
    return `${year}-${pad(month)}-${pad(day)}`
  }

  const [first, second, year] = trimmed.split('/')
  const [month, day] = format === 'MM/DD/YYYY' ? [first, second] : [second, first]
  return `${year}-${pad(month)}-${pad(day)}`
}

function pad(value: string): string {
  return value.padStart(2, '0')
}

export function parseAmountToMinorUnits(value: string): number {
  const trimmed = value.trim()
  const isParenthesizedNegative = trimmed.startsWith('(') && trimmed.endsWith(')')
  const cleaned = trimmed.replace(/[()$,]/g, '')
  const minorUnits = Math.round(Number.parseFloat(cleaned) * 100)
  return isParenthesizedNegative ? -Math.abs(minorUnits) : minorUnits
}

function readAmount(row: Record<string, string>, amount: AmountMapping): { amount: number; direction: Direction } {
  if (amount.shape === 'single') {
    const value = parseAmountToMinorUnits(row[amount.amountColumn] ?? '')
    // Bank CSVs don't export $0.00 rows in practice; treat zero as income
    // rather than leave the sign check ambiguous.
    return { amount: value, direction: value < 0 ? 'expense' : 'income' }
  }

  const debit = (row[amount.debitColumn] ?? '').trim()
  if (debit) {
    return { amount: -Math.abs(parseAmountToMinorUnits(debit)), direction: 'expense' }
  }
  const credit = (row[amount.creditColumn] ?? '').trim()
  return { amount: Math.abs(parseAmountToMinorUnits(credit)), direction: 'income' }
}

export function parseTransactionRows(rows: Record<string, string>[], mapping: ColumnMapping): NewTransaction[] {
  return rows.map((row) => {
    const { amount, direction } = readAmount(row, mapping.amount)
    return {
      accountId: mapping.accountId,
      date: parseDate(row[mapping.dateColumn] ?? '', mapping.dateFormat),
      amount,
      description: (row[mapping.descriptionColumn] ?? '').trim(),
      direction,
      categoryId: UNCATEGORIZED,
      bankTransactionId: mapping.idColumn ? (row[mapping.idColumn] ?? '').trim() : undefined,
    }
  })
}
