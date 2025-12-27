import { env } from "@/lib/env"

export const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL

/**
 * 2025+: Supabase is moving from legacy anon keys to a new publishable key.
 * We support both so existing projects keep working.
 */
export const supabasePublishableKey =
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""

if (!supabasePublishableKey) {
  // `lib/env.ts` already enforces this, but keep a defensive runtime check.
  throw new Error("Missing Supabase public key. Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY.")
}


