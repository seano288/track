export type DateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD'

export type AmountMapping =
  | { shape: 'single'; amountColumn: string }
  | { shape: 'debit-credit'; debitColumn: string; creditColumn: string }

export interface ColumnMapping {
  accountId: string
  dateColumn: string
  descriptionColumn: string
  dateFormat: DateFormat
  idColumn?: string
  amount: AmountMapping
}
