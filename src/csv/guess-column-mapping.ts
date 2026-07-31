export interface GuessedColumnMapping {
  dateColumn: string | undefined
  amountColumn: string | undefined
  descriptionColumn: string | undefined
}

const DATE_HEADERS = ['date', 'transaction date', 'posted date', 'trans date']
const AMOUNT_HEADERS = ['amount', 'transaction amount']
const DESCRIPTION_HEADERS = ['description', 'memo', 'payee', 'transaction description']

export function guessColumnMapping(headers: string[]): GuessedColumnMapping {
  return {
    dateColumn: findHeader(headers, DATE_HEADERS),
    amountColumn: findHeader(headers, AMOUNT_HEADERS),
    descriptionColumn: findHeader(headers, DESCRIPTION_HEADERS),
  }
}

function findHeader(headers: string[], candidates: string[]): string | undefined {
  return headers.find((header) => candidates.includes(header.trim().toLowerCase()))
}
