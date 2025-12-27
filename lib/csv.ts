export type CsvPrimitive = string | number | boolean | null | undefined

function normalizeCell(value: CsvPrimitive): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "boolean") return value ? "true" : "false"
  return String(value)
}

function escapeCsvCell(raw: string): string {
  // Quote if contains special chars. Double quotes inside quoted field.
  if (/[",\r\n]/.test(raw)) {
    return `"${raw.replaceAll('"', '""')}"`
  }
  return raw
}

/**
 * RFC4180-ish CSV stringify (comma separated, CRLF line breaks).
 * - Always writes header row.
 * - Escapes cells with quotes when needed.
 */
export function stringifyCsv(headers: string[], rows: CsvPrimitive[][]): string {
  const headerLine = headers.map((h) => escapeCsvCell(normalizeCell(h))).join(",")
  const lines = [headerLine]
  for (const row of rows) {
    const line = headers
      .map((_, idx) => escapeCsvCell(normalizeCell(row[idx])))
      .join(",")
    lines.push(line)
  }
  return lines.join("\r\n")
}

function stripBom(text: string) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

/**
 * CSV parse (supports quoted fields, escaped quotes, CRLF/LF).
 * Returns rows as array of arrays. Does not coerce types.
 */
export function parseCsvToRows(csvText: string): string[][] {
  const text = stripBom(csvText ?? "")
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let inQuotes = false

  const pushCell = () => {
    row.push(cell)
    cell = ""
  }

  const pushRow = () => {
    // Avoid pushing a trailing empty row from final newline
    const isTrulyEmpty = row.length === 1 && row[0] === ""
    if (row.length > 0 && !isTrulyEmpty) rows.push(row)
    row = []
  }

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    if (inQuotes) {
      if (ch === '"') {
        const next = text[i + 1]
        if (next === '"') {
          cell += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cell += ch
      }
      continue
    }

    if (ch === '"') {
      inQuotes = true
      continue
    }

    if (ch === ",") {
      pushCell()
      continue
    }

    if (ch === "\n") {
      pushCell()
      pushRow()
      continue
    }

    if (ch === "\r") {
      // If CRLF, skip the following LF
      const next = text[i + 1]
      if (next === "\n") i++
      pushCell()
      pushRow()
      continue
    }

    cell += ch
  }

  // Flush last cell/row
  pushCell()
  pushRow()

  return rows
}

export function parseCsvWithHeaders(csvText: string): { headers: string[]; rows: Record<string, string>[] } {
  const all = parseCsvToRows(csvText)
  if (all.length === 0) return { headers: [], rows: [] }

  const headers = all[0].map((h) => h.trim())
  const rows = all.slice(1).map((cells) => {
    const rec: Record<string, string> = {}
    for (let i = 0; i < headers.length; i++) {
      rec[headers[i]] = cells[i] ?? ""
    }
    return rec
  })

  return { headers, rows }
}


