import { createClient } from "@supabase/supabase-js"

import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/config"

/**
 * Server Supabase client for App Router (Server Components / Route Handlers).
 *
 * This is a DB/API client only (no cookie-based SSR auth refresh).
 * We deliberately avoid `@supabase/ssr` here because some Next 16 (Turbopack) setups
 * fail to resolve it at dev-time.
 */
export function createSupabaseServerClient() {
  return createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      // Server-side: do not persist session in storage/cookies.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}


