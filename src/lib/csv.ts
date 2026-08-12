/**
 * Minimal RFC 4180 CSV reader.
 *
 * Handles quoted fields containing commas/newlines, `""` escapes, CRLF or LF
 * line endings, and a leading UTF-8 BOM. Returns rows of raw strings; it does
 * no type coercion — interpreting values is `import-map.ts`'s job.
 */
export function parseCsv(text: string, delimiter = ","): string[][] {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let i = 0;

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    // Skip rows that are entirely empty (trailing newline, blank separators).
    if (row.some((cell) => cell.trim() !== "")) rows.push(row);
    row = [];
  };

  while (i < src.length) {
    const ch = src[i]!;

    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }

    if (ch === '"' && field.trim() === "") {
      // Only treat a quote as opening a quoted field at the field's start,
      // so stray mid-field quotes (e.g. `AMAZON MKTPL*5"N`) stay literal.
      field = "";
      quoted = true;
      i++;
      continue;
    }
    if (ch === delimiter) {
      endField();
      i++;
      continue;
    }
    if (ch === "\r") {
      if (src[i + 1] === "\n") i++;
      endRow();
      i++;
      continue;
    }
    if (ch === "\n") {
      endRow();
      i++;
      continue;
    }
    field += ch;
    i++;
  }

  // Flush whatever the final line left behind (file may not end in a newline).
  if (field !== "" || row.length > 0) endRow();

  return rows.map((r) => r.map((cell) => cell.trim()));
}

/**
 * Guess the delimiter by counting candidates in the header line. Some banks
 * export semicolon- or tab-separated files with a .csv extension.
 */
export function detectDelimiter(text: string): string {
  const firstLine = text.slice(0, 4000).split(/\r?\n/, 1)[0] ?? "";
  const candidates = [",", ";", "\t", "|"];
  let best = ",";
  let bestCount = 0;
  for (const candidate of candidates) {
    // Count only outside quotes, so quoted descriptions don't skew the vote.
    let count = 0;
    let quoted = false;
    for (let i = 0; i < firstLine.length; i++) {
      const ch = firstLine[i]!;
      if (ch === '"') quoted = !quoted;
      else if (ch === candidate && !quoted) count++;
    }
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }
  return best;
}
