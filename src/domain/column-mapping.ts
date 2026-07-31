export type DateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD'

export interface ColumnMapping {
  accountId: string
  dateColumn: string
  amountColumn: string
  descriptionColumn: string
  dateFormat: DateFormat
}
