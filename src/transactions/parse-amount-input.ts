import { parseAmountToMinorUnits } from '../csv/parse-transactions.ts'

// parseAmountToMinorUnits trusts its input (bank-generated CSV values). User
// keystrokes are not trustworthy in the same way, so this wraps it with a
// finite-number check for the manual add/edit forms.
export function parseAmountInput(value: string): number | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined

  const minorUnits = parseAmountToMinorUnits(trimmed)
  return Number.isFinite(minorUnits) ? minorUnits : undefined
}
