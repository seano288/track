export interface ParsedCsv {
  headers: string[]
  rows: Record<string, string>[]
}

export function parseCsv(text: string): ParsedCsv {
  const table = parseRows(text)
  const [headers, ...dataRows] = table
  if (!headers) return { headers: [], rows: [] }

  const rows = dataRows
    .filter((row) => row.some((field) => field !== ''))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])))

  return { headers, rows }
}

function parseRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let index = 0

  while (index < text.length) {
    const char = text[index]

    if (inQuotes) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"'
        index += 2
        continue
      }
      if (char === '"') {
        inQuotes = false
        index++
        continue
      }
      field += char
      index++
      continue
    }

    if (char === '"') {
      inQuotes = true
      index++
      continue
    }
    if (char === ',') {
      row.push(field)
      field = ''
      index++
      continue
    }
    if (char === '\r') {
      index++
      continue
    }
    if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      index++
      continue
    }
    field += char
    index++
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}
