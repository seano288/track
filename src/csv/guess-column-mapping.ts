export type GuessedAmountMapping =
  | { shape: 'single'; amountColumn: string | undefined }
  | { shape: 'debit-credit'; debitColumn: string; creditColumn: string }

export interface GuessedColumnMapping {
  dateColumn: string | undefined
  descriptionColumn: string | undefined
  amount: GuessedAmountMapping
}

const DATE_HEADERS = ['date', 'transaction date', 'posted date', 'trans date']
const AMOUNT_HEADERS = ['amount', 'transaction amount']
const DEBIT_HEADERS = ['debit', 'withdrawal', 'payment']
const CREDIT_HEADERS = ['credit', 'deposit']
const DESCRIPTION_HEADERS = ['description', 'memo', 'payee', 'transaction description']

export function guessColumnMapping(headers: string[]): GuessedColumnMapping {
  return {
    dateColumn: findHeader(headers, DATE_HEADERS),
    descriptionColumn: findHeader(headers, DESCRIPTION_HEADERS),
    amount: guessAmountMapping(headers),
  }
}

function guessAmountMapping(headers: string[]): GuessedAmountMapping {
  const debitColumn = findHeader(headers, DEBIT_HEADERS)
  const creditColumn = findHeader(headers, CREDIT_HEADERS)
  if (debitColumn && creditColumn) {
    return { shape: 'debit-credit', debitColumn, creditColumn }
  }
  return { shape: 'single', amountColumn: findHeader(headers, AMOUNT_HEADERS) }
}

function findHeader(headers: string[], candidates: string[]): string | undefined {
  return headers.find((header) => candidates.includes(header.trim().toLowerCase()))
}
