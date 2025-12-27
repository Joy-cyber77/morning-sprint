import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

/**
 * Lightweight `.env*` loader + validator hook.
 * - Does NOT start Next dev server.
 * - Reads env files from the project root (this file's parent directory).
 * - Loads variables into process.env (without overwriting existing process.env).
 * - Then imports `lib/env.ts` which runs zod validation and prints a friendly result.
 */

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, "..")

const candidatesInPrecedenceOrder = [
  ".env.local",
  ".env.development.local",
  ".env.development",
  ".env",
]

function stripBOM(s) {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s
}

function unquote(s) {
  const trimmed = s.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

function parseDotenv(content) {
  const out = {}
  const lines = stripBOM(content).split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue

    const eq = trimmed.indexOf("=")
    if (eq === -1) continue

    const key = trimmed.slice(0, eq).trim()
    if (!key) continue

    // Support inline comments only when value isn't quoted.
    let rawValue = trimmed.slice(eq + 1)
    const maybeQuoted = rawValue.trimStart()
    const isQuoted = maybeQuoted.startsWith('"') || maybeQuoted.startsWith("'")
    if (!isQuoted) {
      const hash = rawValue.indexOf("#")
      if (hash !== -1) rawValue = rawValue.slice(0, hash)
    }

    out[key] = unquote(rawValue)
  }
  return out
}

function maskValue(v) {
  if (v == null) return "(missing)"
  const s = String(v)
  if (s.length === 0) return "(empty)"
  if (s.length <= 6) return "*".repeat(s.length)
  return `${s.slice(0, 2)}***${s.slice(-2)}`
}

function describeValue(v) {
  if (v == null) return { kind: "missing", length: 0, json: "null" }
  const s = String(v)
  return { kind: s.length === 0 ? "empty" : "present", length: s.length, json: JSON.stringify(s) }
}

const existingEnvFiles = []
const merged = {}
const rawFileContents = new Map()

// Also detect weird duplicates like ".env (1)" etc (OneDrive/conflict copies).
let dotEnvLike = []
try {
  dotEnvLike = fs
    .readdirSync(projectRoot, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.startsWith(".env"))
    .map((d) => d.name)
    .sort()
} catch {
  // ignore
}

for (const filename of candidatesInPrecedenceOrder) {
  const full = path.join(projectRoot, filename)
  if (!fs.existsSync(full)) continue
  const content = fs.readFileSync(full, "utf8")
  existingEnvFiles.push({ filename, bytes: Buffer.byteLength(content, "utf8") })
  rawFileContents.set(filename, content)
  if (content.includes("\u0000")) {
    console.log(
      `⚠️  Warning: ${filename} contains NUL (\\u0000) characters. This usually means the file is UTF-16 encoded. Please re-save as UTF-8.`
    )
    console.log("")
  }
  Object.assign(merged, parseDotenv(content))
}

for (const [k, v] of Object.entries(merged)) {
  if (process.env[k] == null) process.env[k] = v
}

const requiredKeys = ["NEXT_PUBLIC_SUPABASE_URL"]

const optionalKeys = ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"]

console.log("== Env check (project root) ==")
console.log(projectRoot)
console.log("")

console.log("Detected .env* files in folder:")
if (dotEnvLike.length === 0) {
  console.log("- (none)")
} else {
  for (const f of dotEnvLike) console.log(`- ${f}`)
}
console.log("")

console.log("Loaded (precedence order):")
if (existingEnvFiles.length === 0) {
  console.log("- (none of .env.local/.env.development(.local)/.env found)")
} else {
  for (const f of existingEnvFiles) console.log(`- ${f.filename} (${f.bytes} bytes)`)
}
console.log("")

console.log("Required keys (masked):")
for (const k of requiredKeys) {
  console.log(`- ${k} = ${maskValue(process.env[k])}`)
}
console.log("")

console.log("Optional keys (masked):")
for (const k of optionalKeys) {
  console.log(`- ${k} = ${maskValue(process.env[k])}`)
}
console.log("")

// Cross-field requirement
if (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.log("❌ FAIL: Missing Supabase public key.")
  console.log("")
  console.log("Set one of the following in `.env.local`:")
  console.log("- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (preferred)")
  console.log("- NEXT_PUBLIC_SUPABASE_ANON_KEY (legacy)")
  process.exitCode = 1
}

console.log("Debug (exact values & lengths):")
for (const k of [...requiredKeys, ...optionalKeys]) {
  const d = describeValue(process.env[k])
  console.log(`- ${k}: kind=${d.kind}, length=${d.length}, json=${d.json}`)
}
console.log("")

// If values look empty, show where they come from in the loaded file(s) without printing secrets.
for (const f of existingEnvFiles.map((x) => x.filename)) {
  const content = rawFileContents.get(f)
  if (!content) continue

  const keysToInspect = [...requiredKeys, ...optionalKeys]
  const lines = stripBOM(content).split(/\r?\n/)
  const hits = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue

    for (const key of keysToInspect) {
      // Match `KEY=...` (allow spaces around `=`)
      const re = new RegExp(`^\\s*${key.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\s*=`)
      if (!re.test(line)) continue

      const eq = line.indexOf("=")
      const rawValue = eq === -1 ? "" : line.slice(eq + 1)
      const parsed = parseDotenv(line)[key]
      hits.push({
        line: i + 1,
        key,
        rawLen: rawValue.length,
        parsedLen: parsed == null ? 0 : String(parsed).length,
        masked: maskValue(parsed),
      })
    }
  }

  if (hits.length > 0) {
    console.log(`Occurrences in ${f} (masked):`)
    for (const h of hits) {
      console.log(`- L${h.line} ${h.key}: parsed=${h.masked} (parsedLen=${h.parsedLen}, rawLen=${h.rawLen})`)
    }
    console.log("")
  }
}

try {
  // Import triggers validation (IIFE) in `lib/env.ts`.
  await import("../lib/env.ts")
  console.log("✅ PASS: lib/env.ts validation succeeded. (.env is readable & keys look valid)")
  process.exitCode = 0
} catch (err) {
  console.log("❌ FAIL: lib/env.ts validation failed.")
  console.log("")
  console.log(String(err?.message ?? err))
  process.exitCode = 1
}


