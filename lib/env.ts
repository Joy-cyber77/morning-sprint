import { z } from "zod"

/**
 * Minimal, strict env validation.
 * - Client components may import NEXT_PUBLIC_* values.
 * - Server-only secrets must NOT be imported into client bundles.
 */

const optionalNonEmptyString = z.preprocess((v) => {
  if (typeof v !== "string") return v
  const trimmed = v.trim()
  return trimmed.length === 0 ? undefined : trimmed
}, z.string().min(1).optional())

const requiredTrimmedString = (message: string) =>
  z.preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string().min(1, message))

const clientEnvSchema = z.object({
  // Supabase: required (we want to validate this before integration work)
  NEXT_PUBLIC_SUPABASE_URL: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid url")
  ),
  // 2025+: prefer Publishable Key (sb_publishable_...) when available.
  // Legacy projects may still use ANON key; allow either, but require at least one.
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optionalNonEmptyString,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalNonEmptyString,

  // Clerk: optional for now (you said you'll add it later)
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: optionalNonEmptyString,

  NEXT_PUBLIC_ADMIN_EMAILS: optionalNonEmptyString,

  NEXT_PUBLIC_CLERK_SIGN_IN_URL: optionalNonEmptyString,
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: optionalNonEmptyString,
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: optionalNonEmptyString,
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: optionalNonEmptyString,
})

export const env = (() => {
  const parsed = clientEnvSchema.safeParse({
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_ADMIN_EMAILS: process.env.NEXT_PUBLIC_ADMIN_EMAILS,
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
    NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL,
    NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL,
  })

  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `- ${i.path.join(".")}: ${i.message}`).join("\n")
    throw new Error(`Invalid environment variables:\n${issues}\n\nCopy \`ENV.example\` to \`.env.local\` and fill it in.`)
  }

  // Enforce at least one Supabase public key.
  if (!parsed.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && !parsed.data.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error(
      "Invalid environment variables:\n- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is required\n\n" +
        "Set one of them in `.env.local`."
    )
  }

  return parsed.data
})()


