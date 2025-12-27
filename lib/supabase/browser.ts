import { createClient } from "@supabase/supabase-js"

import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/config"

/**
 * Browser Supabase client (for Client Components).
 */
export function createSupabaseBrowserClient() {
  return createClient(supabaseUrl, supabasePublishableKey)
}


