import { createClient } from "@supabase/supabase-js"

import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/config"

type GetClerkToken = () => Promise<string | null>

/**
 * Clerk 토큰을 Supabase 요청에 주입하는 "브라우저 전용" 클라이언트.
 *
 * - Client Component에서 `useAuth().getToken`을 인자로 전달해 사용합니다.
 * - RLS를 사용하는 테이블 접근은 이 클라이언트를 통해 수행해야 합니다.
 */
export function createClerkSupabaseBrowserClient(params: { getToken: GetClerkToken }) {
  const { getToken } = params

  return createClient(supabaseUrl, supabasePublishableKey, {
    async accessToken() {
      return getToken()
    },
  })
}


