import { describe, expect, it } from 'vitest'
import { parseCsv } from './parse-csv.ts'

describe('parseCsv', () => {
  it('parses headers and rows into objects keyed by header', () => {
    const csv = 'Date,Amount,Description\n01/02/2024,-12.34,Coffee shop\n01/03/2024,500.00,Paycheck\n'

    expect(parseCsv(csv)).toEqual({
      headers: ['Date', 'Amount', 'Description'],
      rows: [
        { Date: '01/02/2024', Amount: '-12.34', Description: 'Coffee shop' },
        { Date: '01/03/2024', Amount: '500.00', Description: 'Paycheck' },
      ],
    })
  })

  it('handles quoted fields containing commas and escaped quotes, and CRLF line endings', () => {
    const csv = 'Date,Amount,Description\r\n01/02/2024,-12.34,"Coffee, ""downtown"""\r\n'

    expect(parseCsv(csv)).toEqual({
      headers: ['Date', 'Amount', 'Description'],
      rows: [{ Date: '01/02/2024', Amount: '-12.34', Description: 'Coffee, "downtown"' }],
    })
  })

  it('ignores a trailing blank line', () => {
    const csv = 'Date,Amount,Description\n01/02/2024,-12.34,Coffee shop\n\n'

    expect(parseCsv(csv).rows).toHaveLength(1)
  })
})
