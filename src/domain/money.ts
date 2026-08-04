// Transaction amounts are stored as minor units (cents); this renders them for display.
export function formatAmount(minorUnits: number): string {
  return (minorUnits / 100).toFixed(2)
}
